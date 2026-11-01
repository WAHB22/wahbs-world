import { useEffect } from 'react';
import { AppShell, Page } from './components/AppShell';
import { useFinance } from './lib/store';
import { Header } from './components/top/Header';
import { SafeToSpend } from './components/top/SafeToSpend';
import { Totals } from './components/top/Totals';
import { Forecast } from './components/forecast/Forecast';
import { Bills } from './components/bills/Bills';
import { Budget } from './components/budget/Budget';
import { Spending } from './components/spending/Spending';
import { Pays } from './components/pays/Pays';
import { Accounts } from './components/accounts/Accounts';
import { Jars } from './components/goals/Jars';
import { Footer } from './components/footer/Footer';
import { ActionBar, ImportSheet, DropZone } from './components/import/ImportFlow';
import { HistorySheet } from './components/history/History';
import { UndoBar } from './components/undo/UndoBar';
import { BootScreen } from './components/boot/BootScreens';
import { Meander } from './components/ui/bits';

export default function App() {
  const boot = useFinance((s) => s.boot);
  const hasData = useFinance((s) => s.data !== null);
  const init = useFinance((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (boot !== 'ready' || !hasData) {
    return (
      <AppShell>
        <BootScreen />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DropZone>
        <Page>
          <Header />
          <main>
            <SafeToSpend />
            <Totals />
            <Forecast />
            <Meander className="mt-9" />
            <Bills />
            <Budget />
            <Spending />
            <Pays />
            <Meander className="mt-9" />
            <Accounts />
            <Jars />
          </main>
          <Footer />
        </Page>
        <ActionBar />
        <ImportSheet />
        <HistorySheet />
        <UndoBar />
      </DropZone>
    </AppShell>
  );
}
