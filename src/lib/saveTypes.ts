/** What happened to a change: written to the database, kept in the demo only, or not written. */
export type SaveOutcome = 'saved' | 'demo' | 'failed';

export interface SaveFailure {
  key: string;
  message: string;
}

export interface SaveStateView {
  /** Writes in flight. */
  pending: number;
  /** Writes that failed and can be retried; the data stays on screen. */
  failed: SaveFailure[];
  lastSavedAt: number | null;
  /** Public demo: nothing is written anywhere. */
  demo: boolean;
}

export type StatusChangeResult = { ok: true } | { ok: false; reason: 'blocked'; issues: import('./commerce').DocIssue[] };

export interface CreateShipmentResult {
  ok: boolean;
  shipmentId?: string;
  outcome?: SaveOutcome;
  /** 'server': numbers guaranteed unique by the database; 'local': checked in this browser only. */
  numbering?: 'server' | 'local';
  error?: string;
}
