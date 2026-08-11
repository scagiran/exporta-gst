import { ShipmentItem } from '../types/exporta';

export interface VgmCalculationResult {
  totalNetWeightKg: number;
  totalDefaultGrossWeightKg: number;
  actualVgmKg?: number;
  differenceKg: number;
  isToleranceExceeded: boolean;
  toleranceWarning: string | null;
  items: (ShipmentItem & {
    activeQty: number;
    lineNetWeightKg: number;
    lineDefaultGrossWeightKg: number;
    lineCalculatedGrossWeightKg: number; // Final gross weight for Packing List
  })[];
}

/**
 * Calculates default net/gross weights and automatically distributes Actual VGM
 * proportionally across shipment items according to Product Master default gross weights.
 *
 * Rules:
 * 1. Default Total Net = sum(Quantity * Default Net Weight per Unit)
 * 2. Default Total Gross = sum(Quantity * Default Gross Weight per Unit)
 * 3. Actual VGM input triggers automatic background distribution.
 * 4. Tolerance check: +5% max accepted over default gross weight.
 *    Exceeded warning: "VGM, varsayılan brüt ağırlığın izin verilen toleransını aşıyor. Lütfen ağırlıkları kontrol edin."
 * 5. Proportional distribution: Item Gross = Actual VGM * (Item Default Gross / Total Default Gross)
 * 6. Reconciliation: Sum of line gross weights MUST equal Actual VGM exactly. Discrepancy applied to last item.
 * 7. Quantities, net weights, and commercial invoice amounts are NEVER altered by VGM.
 */
export function calculateVgmAndWeights(
  items: ShipmentItem[],
  actualLoadingEntered: boolean,
  totalVgmKg?: number
): VgmCalculationResult {
  let totalNet = 0;
  let totalDefaultGross = 0;

  const processedItems = items.map((item) => {
    const activeQty =
      actualLoadingEntered && item.actualLoadedQty !== undefined
        ? item.actualLoadedQty
        : item.orderedQty;

    const unitNet = item.netWeightKg || 0;
    const unitGross = item.grossWeightKg || 0;

    const lineNet = Math.round(activeQty * unitNet * 100) / 100;
    const lineDefaultGross = Math.round(activeQty * unitGross * 100) / 100;

    totalNet += lineNet;
    totalDefaultGross += lineDefaultGross;

    return {
      ...item,
      activeQty,
      lineNetWeightKg: lineNet,
      lineDefaultGrossWeightKg: lineDefaultGross,
      lineCalculatedGrossWeightKg: lineDefaultGross,
    };
  });

  totalNet = Math.round(totalNet * 100) / 100;
  totalDefaultGross = Math.round(totalDefaultGross * 100) / 100;

  // If no actual VGM is provided or <= 0, return defaults
  if (!totalVgmKg || totalVgmKg <= 0) {
    return {
      totalNetWeightKg: totalNet,
      totalDefaultGrossWeightKg: totalDefaultGross,
      actualVgmKg: undefined,
      differenceKg: 0,
      isToleranceExceeded: false,
      toleranceWarning: null,
      items: processedItems,
    };
  }

  const actualVgm = Math.round(totalVgmKg * 100) / 100;
  const difference = Math.round((actualVgm - totalDefaultGross) * 100) / 100;

  // Tolerance check (+5% system operational rule)
  const maxAcceptedVgm = Math.round(totalDefaultGross * 1.05 * 100) / 100;
  const isToleranceExceeded = actualVgm > maxAcceptedVgm;
  const toleranceWarning = isToleranceExceeded
    ? 'VGM, varsayılan brüt ağırlığın izin verilen toleransını aşıyor. Lütfen ağırlıkları kontrol edin.'
    : null;

  // Automatic Proportional Distribution
  if (totalDefaultGross > 0) {
    let distributedSum = 0;
    let lastEligibleIndex = -1;

    for (let i = 0; i < processedItems.length; i++) {
      const item = processedItems[i];
      if (item.lineDefaultGrossWeightKg > 0) {
        lastEligibleIndex = i;
      }
      const ratio = item.lineDefaultGrossWeightKg / totalDefaultGross;
      const rawCalculated = actualVgm * ratio;
      // Round to 1 decimal place (standard for kg weights)
      const roundedGross = Math.round(rawCalculated * 10) / 10;
      item.lineCalculatedGrossWeightKg = roundedGross;
      item.vgmWeightKg = roundedGross;
      distributedSum += roundedGross;
    }

    // Rounding Reconciliation: Sum of line gross weights MUST match Actual VGM exactly
    distributedSum = Math.round(distributedSum * 10) / 10;
    const targetVgm = Math.round(actualVgm * 10) / 10;
    const discrepancy = Math.round((targetVgm - distributedSum) * 10) / 10;

    if (discrepancy !== 0 && lastEligibleIndex >= 0) {
      const targetItem = processedItems[lastEligibleIndex];
      const adjusted = Math.round((targetItem.lineCalculatedGrossWeightKg + discrepancy) * 10) / 10;
      targetItem.lineCalculatedGrossWeightKg = adjusted;
      targetItem.vgmWeightKg = adjusted;
    }
  } else if (processedItems.length > 0) {
    // If total default gross is 0, split equally as fallback
    const equalShare = Math.round((actualVgm / processedItems.length) * 10) / 10;
    let sum = 0;
    processedItems.forEach((item, idx) => {
      item.lineCalculatedGrossWeightKg = equalShare;
      item.vgmWeightKg = equalShare;
      sum += equalShare;
      if (idx === processedItems.length - 1) {
        const diff = Math.round((actualVgm - sum) * 10) / 10;
        item.lineCalculatedGrossWeightKg = Math.round((item.lineCalculatedGrossWeightKg + diff) * 10) / 10;
        item.vgmWeightKg = item.lineCalculatedGrossWeightKg;
      }
    });
  }

  return {
    totalNetWeightKg: totalNet,
    totalDefaultGrossWeightKg: totalDefaultGross,
    actualVgmKg: actualVgm,
    differenceKg: difference,
    isToleranceExceeded,
    toleranceWarning,
    items: processedItems,
  };
}
