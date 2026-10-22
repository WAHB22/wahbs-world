import { Component, type ReactNode } from "react";
import { resetDemo } from "../store/store";

/** If anything fails while rendering, offer a way back instead of a white page. */
export class CrashGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-start justify-center gap-4 px-6">
        <h1 className="text-[28px] font-semibold">The demo data on this device could not be read.</h1>
        <p className="text-[15px] text-muted">Start again with fresh demo data. Nothing outside this browser is affected.</p>
        <button
          type="button"
          onClick={() => {
            resetDemo();
            location.replace("/");
          }}
          className="h-11 rounded-[10px] bg-green px-5 font-medium text-white"
        >
          Reset demo data
        </button>
      </main>
    );
  }
}
