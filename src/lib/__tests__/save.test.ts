/**
 * Scenario 6: a failed write is reported, never swallowed.
 * Without VITE_* settings the client points at an unreachable address (no
 * database, by design for local builds), so every write fails at the network
 * level. The service must return that failure to the caller.
 */
import { describe, it, expect } from 'vitest';
import { saveShipment, saveCustomer, saveOrgPreferences } from '../supabaseService';
import { dataEnv } from '../supabase';
import type { MasterShipment } from '../../types/exporta';

describe('scenario 6: network failure', () => {
  it('runs without a database unless one is configured explicitly', () => {
    expect(dataEnv).toBe('none');
  });

  it('returns an error for every failed write instead of logging and moving on', async () => {
    const r1 = await saveShipment('org', { id: 's1' } as MasterShipment);
    const r2 = await saveCustomer('org', { id: 'c1' } as never);
    const r3 = await saveOrgPreferences('org', {} as never);
    for (const r of [r1, r2, r3]) {
      expect(r.error).not.toBeNull();
      expect(typeof r.error?.message).toBe('string');
    }
  }, 30000);
});
