import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useMoney } from '../lib/money';
import { Download, Filter, Printer, FileText } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

export default function Archive() {
  const { t } = useTranslation();
  const { archives, employees } = useDatabaseStore();
  const money = useMoney();
  
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  // Available years from archives
  const availableYears = useMemo(() => {
    const years = new Set(archives.map(a => a.year));
    // add current and previous year just in case
    years.add(new Date().getFullYear());
    years.add(new Date().getFullYear() - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [archives]);

  // Available departments
  const availableDepartments = useMemo(() => {
    const depts = new Set(archives.map(a => a.department));
    return Array.from(depts).sort();
  }, [archives]);

  // Filtered archives
  const filteredArchives = useMemo(() => {
    return archives.filter(record => {
      const matchYear = selectedYear === 'all' || record.year.toString() === selectedYear;
      const matchDept = selectedDepartment === 'all' || record.department === selectedDepartment;
      const matchEmp = selectedEmployee === 'all' || record.employeeId === selectedEmployee;
      return matchYear && matchDept && matchEmp;
    });
  }, [archives, selectedYear, selectedDepartment, selectedEmployee]);

  // Aggregate by employee for the selected year if needed, or just show raw records
  // Let's show raw records (monthly) or aggregate them? The prompt says "all data of each past year... each employee, each month, each year".
  // So displaying the records as they are is fine, maybe grouped or just a list.

  const handleExportExcel = () => {
    const data = filteredArchives.map(a => ({
      [t('archive.year')]: a.year,
      [t('archive.month')]: a.month,
      [t('timeoff.colEmployee')]: a.employeeName,
      [t('employees.col.department')]: a.department,
      [t('employees.col.position')]: a.position,
      [t('employees.col.salary')]: a.salary,
      [t('archive.workedHours')]: a.hoursWorked
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('archive.sheetName'));
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `archive_${selectedYear}.xlsx`);
  };

  const handleExportPDF = () => {
    const element = document.getElementById('archive-table-container');
    const opt = {
      margin:       1,
      filename:     `archive_${selectedYear}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">{t('archive.title')}</h2>
          <p className="text-muted mt-1">{t('archive.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-surface-3 text-primary rounded-lg hover:bg-surface-hover transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('employees.doc.print')}
          </button>
        </div>
      </div>

      <div className="bg-surface border border-subtle rounded-xl p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">{t('archive.year')}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-surface-3 border border-line text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="all">{t('archive.allYears')}</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">{t('orgchart.subdivision')}</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-surface-3 border border-line text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="all">{t('timesheet.allDepartments')}</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">{t('timeoff.colEmployee')}</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-surface-3 border border-line text-primary rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="all">{t('archive.allEmployees')}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden print-container" id="archive-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-3 text-secondary">
              <tr>
                <th className="p-table text-table font-medium">{t('archive.year')}</th>
                <th className="p-table text-table font-medium">{t('archive.month')}</th>
                <th className="p-table text-table font-medium">{t('timeoff.colEmployee')}</th>
                <th className="p-table text-table font-medium">{t('employees.col.department')}</th>
                <th className="p-table text-table font-medium">{t('employees.col.position')}</th>
                <th className="p-table text-table font-medium text-right">{t('employees.col.salary')}</th>
                <th className="p-table text-table font-medium text-right">{t('archive.colHours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-secondary">
              {filteredArchives.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-table text-table text-center text-muted py-8">
                    {t('archive.noData')}
                  </td>
                </tr>
              ) : (
                filteredArchives.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-hover transition-colors">
                    <td className="p-table text-table font-medium text-primary">{record.year}</td>
                    <td className="p-table text-table">{record.month}</td>
                    <td className="p-table text-table text-accent-400">{record.employeeName}</td>
                    <td className="p-table text-table">{record.department}</td>
                    <td className="p-table text-table">{record.position}</td>
                    <td className="p-table text-table text-right font-medium">
                      {money.format(record.salary)}
                    </td>
                    <td className="p-table text-table text-right text-muted">
                      {record.hoursWorked} {t('archive.hoursShort')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
