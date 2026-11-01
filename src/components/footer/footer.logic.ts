/** Backup download and restore. Pure: the component does the file reading and the click. */
import type { FinanceData, ISODate } from '@/lib/types';
import { migrate } from '@/lib/migrate';

export const RESTORE_NOTE = 'Restored a backup file';
export const BAD_FILE = 'That file is not a finance backup.';

/** 'finance-backup-2026-11-14.json', same name as the live page. */
export const backupFileName = (today: ISODate) => `finance-backup-${today}.json`;

/** The whole saved data, unknown fields included. */
export const backupJson = (data: FinanceData) => JSON.stringify(data, null, 2);

/** Parsed and migrated to v2, or null when the text is not a finance backup. */
export function readBackup(text: string): FinanceData | null {
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}
