import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Собирает книгу Excel из массива объектов.
 *
 * Отделено от скачивания намеренно: сборка — чистая функция, её можно
 * проверить тестом без браузера, а скачивание требует DOM и проверяется
 * только руками.
 */
export const buildWorkbook = async (data: Record<string, unknown>[]): Promise<ArrayBuffer | null> => {
  if (data.length === 0) return null;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Заголовки собираем по всем строкам: у разреженных данных первая строка
  // может не содержать всех колонок, и они потерялись бы молча.
  const headers = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  worksheet.addRow(headers);

  data.forEach(item => {
    worksheet.addRow(headers.map(h => item[h] ?? null));
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
};

export const exportToExcel = async (data: any[], filename: string) => {
  const buffer = await buildWorkbook(data);
  if (!buffer) return;

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();

  window.URL.revokeObjectURL(url);
};

/**
 * Разбирает содержимое книги в массив строк. Вынесено из parseExcel по той же
 * причине: чтение файла требует браузера, разбор — нет.
 */
export const parseWorkbook = (data: ArrayBuffer | Uint8Array | string, type: 'binary' | 'array' = 'binary'): any[] => {
  const workbook = XLSX.read(data, { type });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
};

export const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(parseWorkbook(e.target?.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
