import { roundTo } from './money';

/**
 * Weight concepts, kept apart on purpose:
 *
 *  - net weight            product only (master data × quantity)
 *  - cargo gross weight    goods including their packing, pallets and lashing,
 *                          as packed. This is what the packing list shows.
 *                          Calculated from master data, or measured on a weighbridge.
 *  - container tare        the empty container's own weight
 *  - VGM                   verified gross mass of the packed container:
 *                          cargo gross + container tare. It is declared by the
 *                          shipper under SOLAS; ExPorta records the declared value,
 *                          it does not weigh or certify anything.
 *
 * The VGM is never spread over product lines and never replaces the packing
 * list's cargo gross weight.
 */

export interface WeightLineInput {
  qty: number;
  netWeightKg: number; // per unit
  grossWeightKg: number; // per unit, packing included
}

export interface WeightInputs {
  lines: WeightLineInput[];
  /** Cargo gross weight read from a weighbridge ticket (container tare excluded). */
  measuredCargoGrossKg?: number;
  /** Empty container weight, from the container door or the carrier. */
  containerTareKg?: number;
  /** Declared VGM: packed container, tare included. */
  declaredVgmKg?: number;
  /** The company's own warning threshold in percent. Not a legal tolerance. */
  warningTolerancePct?: number;
}

export type WeightIssue =
  | { code: 'NET_EXCEEDS_GROSS'; line: number }
  | { code: 'INVALID_WEIGHT'; line: number }
  | { code: 'VGM_BELOW_CARGO'; vgmKg: number; cargoKg: number }
  | { code: 'VGM_DIFFERS'; vgmKg: number; expectedKg: number; diffKg: number; diffPct: number; tolerancePct: number }
  | { code: 'MEASURED_DIFFERS'; measuredKg: number; calculatedKg: number; diffKg: number; diffPct: number; tolerancePct: number };

export interface WeightSummary {
  lineNetKg: number[];
  lineCargoGrossKg: number[];
  totalNetKg: number;
  /** Calculated from master data. */
  calculatedCargoGrossKg: number;
  measuredCargoGrossKg?: number;
  containerTareKg?: number;
  declaredVgmKg?: number;
  /** Cargo gross (measured if known, else calculated) + tare, when the tare is known. */
  expectedVgmKg?: number;
  issues: WeightIssue[];
}

export const DEFAULT_WARNING_TOLERANCE_PCT = 5;

const positive = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function summariseWeights(input: WeightInputs): WeightSummary {
  const tol = positive(input.warningTolerancePct) ? input.warningTolerancePct : DEFAULT_WARNING_TOLERANCE_PCT;
  const issues: WeightIssue[] = [];

  const lineNetKg: number[] = [];
  const lineCargoGrossKg: number[] = [];
  input.lines.forEach((l, i) => {
    const valid = [l.qty, l.netWeightKg, l.grossWeightKg].every((n) => Number.isFinite(n) && n >= 0);
    if (!valid) issues.push({ code: 'INVALID_WEIGHT', line: i });
    if (valid && l.netWeightKg > l.grossWeightKg) issues.push({ code: 'NET_EXCEEDS_GROSS', line: i });
    lineNetKg.push(valid ? roundTo(l.qty * l.netWeightKg, 2) : 0);
    lineCargoGrossKg.push(valid ? roundTo(l.qty * l.grossWeightKg, 2) : 0);
  });

  const totalNetKg = roundTo(lineNetKg.reduce((a, b) => a + b, 0), 2);
  const calculatedCargoGrossKg = roundTo(lineCargoGrossKg.reduce((a, b) => a + b, 0), 2);

  const measured = positive(input.measuredCargoGrossKg) ? roundTo(input.measuredCargoGrossKg, 2) : undefined;
  const tare = positive(input.containerTareKg) ? roundTo(input.containerTareKg, 2) : undefined;
  const vgm = positive(input.declaredVgmKg) ? roundTo(input.declaredVgmKg, 2) : undefined;

  if (measured !== undefined && calculatedCargoGrossKg > 0) {
    const diffKg = roundTo(measured - calculatedCargoGrossKg, 2);
    const diffPct = roundTo((diffKg / calculatedCargoGrossKg) * 100, 2);
    if (Math.abs(diffPct) > tol) {
      issues.push({ code: 'MEASURED_DIFFERS', measuredKg: measured, calculatedKg: calculatedCargoGrossKg, diffKg, diffPct, tolerancePct: tol });
    }
  }

  const cargoForVgm = measured ?? calculatedCargoGrossKg;
  let expectedVgmKg: number | undefined;
  if (vgm !== undefined) {
    if (cargoForVgm > 0 && vgm < cargoForVgm) {
      issues.push({ code: 'VGM_BELOW_CARGO', vgmKg: vgm, cargoKg: cargoForVgm });
    }
    if (tare !== undefined && cargoForVgm > 0) {
      expectedVgmKg = roundTo(cargoForVgm + tare, 2);
      const diffKg = roundTo(vgm - expectedVgmKg, 2);
      const diffPct = roundTo((diffKg / expectedVgmKg) * 100, 2);
      if (Math.abs(diffPct) > tol) {
        issues.push({ code: 'VGM_DIFFERS', vgmKg: vgm, expectedKg: expectedVgmKg, diffKg, diffPct, tolerancePct: tol });
      }
    }
  } else if (tare !== undefined && cargoForVgm > 0) {
    expectedVgmKg = roundTo(cargoForVgm + tare, 2);
  }

  return {
    lineNetKg,
    lineCargoGrossKg,
    totalNetKg,
    calculatedCargoGrossKg,
    measuredCargoGrossKg: measured,
    containerTareKg: tare,
    declaredVgmKg: vgm,
    expectedVgmKg,
    issues,
  };
}
