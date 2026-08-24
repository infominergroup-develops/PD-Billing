import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Search, Filter, Save } from 'lucide-react';

interface RawExcelViewerProps {
  rawCases: Record<string, any>[];
  fileName?: string;
  onRawDataEdit: (updatedCases: Record<string, any>[]) => void;
}

export const RawExcelViewer: React.FC<RawExcelViewerProps> = ({ rawCases, fileName, onRawDataEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('ALL');
  const [editingData, setEditingData] = useState<Record<string, any>[] | null>(null);

  // Sync internal state with props if not actively editing
  React.useEffect(() => {
    if (!editingData && rawCases.length > 0) {
      setEditingData([...rawCases]);
    }
  }, [rawCases, editingData]);
  const columns = useMemo(() => {
    if (!rawCases || rawCases.length === 0) return [];
    
    // Collect all unique keys from the raw data
    const keySet = new Set<string>();
    rawCases.forEach(row => {
      Object.keys(row).forEach(key => {
        if (!key.startsWith('_')) { // Exclude internal properties like _rawRowIdx
          keySet.add(key);
        }
      });
    });
    return Array.from(keySet);
  }, [rawCases]);

  const currentData = editingData || rawCases;

  const filteredData = useMemo(() => {
    if (!searchTerm) return currentData;
    const term = searchTerm.toLowerCase();
    
    return currentData.filter((row) => {
      if (filterColumn !== 'ALL') {
        const val = row[filterColumn];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      }
      // Search all columns
      return columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      });
    });
  }, [currentData, searchTerm, filterColumn, columns]);

  const handleCellEdit = (rowIndex: number, col: string, value: string) => {
    // Find the original index if we are viewing filtered data
    // The easiest way is to use the _rawRowIdx if it exists, otherwise we have to mutate currentData directly.
    // Let's just update the currentData array directly by finding the item.
    
    setEditingData(prev => {
      if (!prev) return prev;
      const newData = [...prev];
      const targetRow = filteredData[rowIndex];
      // Find where targetRow is in newData
      const actualIndex = newData.indexOf(targetRow);
      
      if (actualIndex > -1) {
        newData[actualIndex] = { ...newData[actualIndex], [col]: value };
      }
      return newData;
    });
  };

  const handleSave = () => {
    if (editingData) {
      onRawDataEdit(editingData);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-[#2d3e50] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#eb8a23]" />
            Exact Uploaded Data Viewer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            1:1 view of the uploaded file: {fileName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-[#2d3e50] hover:bg-[#1a2530] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#eb8a23]" />
            Save Changes
          </button>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            Total Rows: {currentData.length}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search raw data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23]"
          />
        </div>
        <div className="relative w-full sm:w-64 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#eb8a23] bg-white"
          >
            <option value="ALL">All Columns</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 max-h-[600px] scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
          <thead className="bg-[#2d3e50] text-white font-bold sticky top-0 z-10">
            <tr>
              <th className="p-2.5 border-r border-slate-600/30 w-10 text-center">Row</th>
              {columns.map(col => (
                <th key={col} className="p-2.5 border-r border-slate-600/30">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredData.slice(0, 500).map((row, idx) => ( 
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="p-2.5 border-r border-slate-100 text-slate-400 text-center">{idx + 1}</td>
                {columns.map(col => (
                  <td key={col} className="p-1 border-r border-slate-100">
                    <input
                      type="text"
                      value={row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                      onChange={(e) => handleCellEdit(idx, col, e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-[#eb8a23] rounded outline-none text-slate-700"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length > 500 && (
           <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
              Showing first 500 rows for performance.
           </div>
        )}
      </div>
    </div>
  );
};
