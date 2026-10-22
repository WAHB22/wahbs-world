import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router";
import { startClock, useApp } from "./store/store";
import { AlertBanners, Prompts } from "./components/Alerts";
import { DemoPanel } from "./components/DemoPanel";
import { Overlays } from "./components/overlays";
import { TopBar } from "./components/TopBar";
import { Assignments } from "./pages/Assignments";
import { LocationHome } from "./pages/LocationHome";
import { Locations } from "./pages/Locations";
import { Login } from "./pages/Login";
import { MachineDetail } from "./pages/MachineDetail";
import { Notifications } from "./pages/Notifications";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

function Shell() {
  const { world } = useApp();
  const { locId } = useParams();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  if (!world.loggedIn) return <Navigate to="/login" replace />;
  if (locId && !world.locations.some((l) => l.id === locId)) return <Navigate to="/locations" replace />;
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30">
        <AlertBanners locId={locId} />
        <TopBar locId={locId} />
      </header>
      <Outlet />
      <Prompts />
      <Overlays />
      <DemoPanel locId={locId} />
    </div>
  );
}

function Home() {
  const { world } = useApp();
  if (!world.loggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={world.locations.length === 1 ? `/l/${world.locations[0].id}` : "/locations"} replace />;
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-[560px] flex-col items-start justify-center px-6">
      <p className="num text-[13px] text-muted">404</p>
      <h1 className="mt-2 text-[32px] font-semibold">This page is not on any machine.</h1>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-[8px] bg-green px-4 text-sm font-medium text-white">
        Back to your locations
      </Link>
    </main>
  );
}

export function App() {
  useEffect(startClock, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Shell />}>
          <Route path="/locations" element={<Locations />} />
          <Route path="/l/:locId" element={<LocationHome />} />
          <Route path="/l/:locId/m/:machineId" element={<MachineDetail />} />
          <Route path="/l/:locId/reports" element={<Reports />} />
          <Route path="/l/:locId/assignments" element={<Assignments />} />
          <Route path="/l/:locId/notifications" element={<Notifications />} />
          <Route path="/l/:locId/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
