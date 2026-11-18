import React from 'react';
import { AlertTriangle, OctagonAlert } from 'lucide-react';
import { useLang } from '../i18n';
import { BLOCKING_ISSUES, DocIssue } from '../lib/commerce';

/** Shows document and weight checks in the user's language; blocking ones first. */
export const IssueList: React.FC<{ issues: DocIssue[]; compact?: boolean }> = ({ issues, compact }) => {
  const { t, num } = useLang();
  const i18n = t.issues;
  if (!issues.length) return null;
  const kg = (n: number) => num(n, { maximumFractionDigits: 1 });
  const pct = (n: number) => num(Math.abs(n), { maximumFractionDigits: 2 });

  const text = (i: DocIssue): string => {
    switch (i.code) {
      case 'MIXED_CURRENCY':
        return i18n.MIXED_CURRENCY(i.currencies.join(', '));
      case 'CURRENCY_NOT_SHIPMENT':
        return i18n.CURRENCY_NOT_SHIPMENT(i.itemCurrency, i.shipmentCurrency);
      case 'PROVISIONAL_QTY':
        return i18n.PROVISIONAL_QTY;
      case 'INVALID_NUMBER':
        return i18n.INVALID_NUMBER(i.line + 1);
      case 'NO_LINES':
        return i18n.NO_LINES;
      case 'NAMED_PLACE_MISSING':
        return i18n.NAMED_PLACE_MISSING(i.derivedFrom);
      case 'INCOTERM_MODE':
        return i18n.INCOTERM_MODE(i.incoterm, t.modes[i.mode as keyof typeof t.modes] ?? i.mode);
      case 'BANK_MISSING':
        return i18n.BANK_MISSING;
      case 'NET_EXCEEDS_GROSS':
        return i18n.NET_EXCEEDS_GROSS(i.line + 1);
      case 'INVALID_WEIGHT':
        return i18n.INVALID_WEIGHT(i.line + 1);
      case 'VGM_BELOW_CARGO':
        return i18n.VGM_BELOW_CARGO(kg(i.vgmKg), kg(i.cargoKg));
      case 'VGM_DIFFERS':
        return i18n.VGM_DIFFERS(kg(i.vgmKg), kg(i.expectedKg), pct(i.diffPct), num(i.tolerancePct));
      case 'MEASURED_DIFFERS':
        return i18n.MEASURED_DIFFERS(kg(i.measuredKg), kg(i.calculatedKg), pct(i.diffPct), num(i.tolerancePct));
    }
  };

  const sorted = [...issues].sort((a, b) => Number(BLOCKING_ISSUES.includes(b.code)) - Number(BLOCKING_ISSUES.includes(a.code)));
  return (
    <ul aria-label={i18n.title} className={`space-y-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {sorted.map((i, n) => {
        const blocking = BLOCKING_ISSUES.includes(i.code);
        return (
          <li
            key={n}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${blocking ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
          >
            {blocking ? <OctagonAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />}
            <span>
              <strong className="mr-1">{blocking ? i18n.blocking : i18n.warning}:</strong>
              {text(i)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
