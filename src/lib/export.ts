import * as XLSX from 'xlsx';

export const exportToXLS = (data: any[], fileName: string) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    // Adjust column widths
    const max_width = data.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => String(v).length)), 10);
    worksheet["!cols"] = Object.keys(data[0]).map(() => ({ wch: max_width }));

    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (error) {
    console.error("Error exporting to XLS:", error);
    return false;
  }
};
