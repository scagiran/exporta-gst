import * as XLSX from 'xlsx';
import { Customer, Product } from '../types/exporta';

/**
 * Live-data Excel export for the customer and product catalogues.
 *
 * The column headers here MUST stay identical to the import template in
 * ExcelImportModal.tsx (`customerFields` / `productFields` labels), so a file
 * exported from here can be edited and re-imported without remapping columns.
 */

const customerColumns: { key: keyof Customer; header: string }[] = [
  { key: 'companyName', header: 'Firma Adı' },
  { key: 'code', header: 'Müşteri Kodu' },
  { key: 'country', header: 'Ülke' },
  { key: 'city', header: 'Şehir' },
  { key: 'address', header: 'Adres' },
  { key: 'taxNo', header: 'Vergi Numarası' },
  { key: 'contactPerson', header: 'Yetkili Kişi' },
  { key: 'email', header: 'E-posta' },
  { key: 'phone', header: 'Telefon' },
];

const productColumns: { key: keyof Product; header: string }[] = [
  { key: 'name', header: 'Ürün Adı' },
  { key: 'code', header: 'Ürün Kodu' },
  { key: 'hsCode', header: 'HS Code (GTİP)' },
  { key: 'description', header: 'Açıklama' },
  { key: 'unit', header: 'Birim' },
  { key: 'origin', header: 'Menşe Ülke' },
  { key: 'netWeightKg', header: 'Net Ağırlık (kg)' },
  { key: 'grossWeightKg', header: 'Brüt Ağırlık (kg)' },
  { key: 'unitPrice', header: 'Birim Fiyat' },
  { key: 'currency', header: 'Para Birimi' },
];

const timestamp = () => new Date().toISOString().split('T')[0];

function download<T>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
  sheetName: string,
  fileBase: string
) {
  const sheetRows = rows.map((row) => {
    const out: Record<string, unknown> = {};
    columns.forEach(({ key, header }) => {
      const value = row[key];
      out[header] = value === undefined || value === null ? '' : value;
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
export function exportCustomersToExcel(customers: Customer[]): boolean {
  if (!customers || customers.length === 0) return false;
  download(customers, customerColumns, 'Müşteriler', 'ExPorta_Musteri_Listesi');
  return true;
}

/** Returns false (and does nothing) when there is nothing to export. */
export function exportProductsToExcel(products: Product[]): boolean {
  if (!products || products.length === 0) return false;
  download(products, productColumns, 'Ürünler', 'ExPorta_Urun_Katalogu');
  return true;
}
