import { useState } from "react";
import { Power } from "lucide-react";
import { closeOverlay, shutdownMachine, toast, updateMachine, useApp, type Overlay } from "../../store/store";
import { activeSession, sessionUser } from "../../sim/insights";
import { TYPES } from "../../sim/catalog";
import { fmtDate } from "../../lib/time";
import { CloseButton, Dialog } from "../Dialog";
import { Button, Field, Switch } from "../ui";
import { inputCls } from "../style";
import { AlertModal } from "./AlertModal";
import { AssignPanel } from "./AssignPanel";
import { TechnicianPanel } from "./Technician";

/** Remember the last payload of each overlay type so it can animate closed with its content. */
function useLast<T extends NonNullable<Overlay>["type"]>(overlay: Overlay, type: T) {
  type P = Extract<NonNullable<Overlay>, { type: T }>;
  const current = overlay?.type === type ? (overlay as P) : undefined;
  const [last, setLast] = useState<P | undefined>(current);
  if (current && current !== last) setLast(current);
  return { open: !!current, last: current ?? last };
}

function ShutdownConfirm({ machineId, open }: { machineId?: string; open: boolean }) {
  const { world } = useApp();
  const m = world.machines.find((x) => x.id === machineId);
  const s = m ? activeSession(world, m.id) : undefined;
  const who = s ? sessionUser(world, s) : undefined;
  return (
    <Dialog open={open && !!m} onClose={closeOverlay} label="Confirm shut down" width={460}>
      <div className="p-6">
        <span className="flex size-11 items-center justify-center rounded-full bg-rust text-white">
          <Power className="size-5" />
        </span>
        <h2 className="mt-4 text-[22px] font-semibold">Shut down {m?.name}?</h2>
        <p className="mt-2 text-[15px] text-ink">The machine will stop and won't restart on its own.</p>
        {who && who.kind !== "unassigned" && <p className="mt-1 text-[14px] text-muted">{who.label}'s session ends now and is logged.</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="lg" onClick={closeOverlay}>
            Cancel
          </Button>
          <Button size="lg" variant="danger" onClick={() => m && shutdownMachine(m.id)}>
            <Power className="size-4" /> Shut down
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function MachineSettings({ machineId, open }: { machineId?: string; open: boolean }) {
  const { world, now } = useApp();
  const m = world.machines.find((x) => x.id === machineId);
  const [name, setName] = useState("");
  const [kw, setKw] = useState("");
  const [never, setNever] = useState(false);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const key = open ? machineId : undefined;
  if (key && key !== lastKey && m) {
    setLastKey(key);
    setName(m.name);
    setKw(String(m.ratedKw));
    setNever(m.neverAutoOff);
  }
  if (!m) return <Dialog open={false} onClose={closeOverlay} label="Machine settings"><div /></Dialog>;
  const kwNum = Number(kw);
  const valid = name.trim().length > 0 && kwNum > 0 && kwNum < 100;
  return (
    <Dialog open={open} onClose={closeOverlay} label="Machine settings" width={520}>
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          updateMachine(m.id, { name: name.trim(), ratedKw: kwNum, neverAutoOff: never });
          toast(`${name.trim()} saved`);
          closeOverlay();
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-[22px] font-semibold">Machine settings</h2>
            <p className="text-[13.5px] text-muted">{TYPES[m.type].label}</p>
          </div>
          <CloseButton onClick={closeOverlay} />
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Name" htmlFor="ms-name">
            <input id="ms-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Rated power (kW)" htmlFor="ms-kw" hint="From the machine's nameplate.">
            <input id="ms-kw" type="number" step="0.05" min="0.01" value={kw} onChange={(e) => setKw(e.target.value)} className={`${inputCls} num`} />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border px-4 py-3">
            <div>
              <p className="text-[14px] font-medium">Never auto shut off</p>
              <p className="text-[13px] text-muted">For fridges, freezers and anything that must stay on.</p>
            </div>
            <Switch checked={never} onChange={setNever} label="Never auto shut off" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border px-4 py-3">
            <div>
              <p className="text-[14px] font-medium">Last service</p>
              <p className="num text-[13px] text-muted">{fmtDate(m.lastServiceAt)}</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                updateMachine(m.id, { lastServiceAt: now });
                toast(`${m.name} marked as serviced today`);
              }}
            >
              Mark serviced today
            </Button>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="lg" onClick={closeOverlay}>
            Cancel
          </Button>
          <Button size="lg" type="submit" variant="primary" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Overlays() {
  const { overlay } = useApp();
  const alert = useLast(overlay, "alert");
  const shut = useLast(overlay, "shutdown");
  const tech = useLast(overlay, "tech");
  const assign = useLast(overlay, "assign");
  const machine = useLast(overlay, "machine");
  return (
    <>
      <AlertModal open={alert.open} eventId={alert.last?.eventId} />
      <ShutdownConfirm open={shut.open} machineId={shut.last?.machineId} />
      <TechnicianPanel open={tech.open} machineId={tech.last?.machineId} eventId={tech.last?.eventId} />
      <AssignPanel open={assign.open} assignmentId={assign.last?.assignmentId} machineIds={assign.last?.machineIds} />
      <MachineSettings open={machine.open} machineId={machine.last?.machineId} />
    </>
  );
}
