import * as XLSX from 'xlsx';
import { Customer, Product } from '../types/exporta';
import type { Lang } from '../i18n/lang';
import { messages } from '../i18n/messages';
import { unitLabel } from '../i18n/units';

/**
 * Live-data Excel export for the customer and product catalogues.
 *
 * The column headers come from the same messages as the import template in
 * ExcelImportModal.tsx, in the user's language, so a file exported from here
 * can be edited and re-imported without remapping columns. The importer also
 * recognises the headers of the other two languages.
 */

const CUSTOMER_KEYS: (keyof Customer)[] = ['companyName', 'code', 'country', 'city', 'address', 'taxNo', 'contactPerson', 'email', 'phone'];
const PRODUCT_KEYS: (keyof Product)[] = [
  'name',
  'code',
  'hsCode',
  'description',
  'unit',
  'origin',
  'netWeightKg',
  'grossWeightKg',
  'unitPrice',
  'currency',
];

const timestamp = () => new Date().toISOString().split('T')[0];

function download<T>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
  sheetName: string,
  fileBase: string,
  format: (key: keyof T, value: unknown) => unknown = (_k, v) => v
) {
  const sheetRows = rows.map((row) => {
    const out: Record<string, unknown> = {};
    columns.forEach(({ key, header }) => {
      const value = row[key];
      out[header] = value === undefined || value === null ? '' : format(key, value);
    });
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(sheetRows, {
    header: columns.map((c) => c.header),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileBase}_${timestamp()}.xlsx`);
}

/** Returns false (and does nothing) when there is nothing to export. */
export function exportCustomersToExcel(customers: Customer[], lang: Lang = 'tr'): boolean {
  if (!customers || customers.length === 0) return false;
  const x = messages[lang].excel;
  const columns = CUSTOMER_KEYS.map((key) => ({ key, header: x.customerCols[key as string] }));
  download(customers, columns, x.sheetCustomers, x.exportFileCustomers);
  return true;
}

/** Returns false (and does nothing) when there is nothing to export. */
export function exportProductsToExcel(products: Product[], lang: Lang = 'tr'): boolean {
  if (!products || products.length === 0) return false;
  const x = messages[lang].excel;
  const columns = PRODUCT_KEYS.map((key) => ({ key, header: x.productCols[key as string] }));
  download(products, columns, x.sheetProducts, x.exportFileProducts, (key, value) =>
    key === 'unit' ? unitLabel(String(value), lang) : value
  );
  return true;
}
