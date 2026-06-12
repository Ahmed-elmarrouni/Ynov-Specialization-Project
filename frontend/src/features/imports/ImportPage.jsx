import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, X, FileSpreadsheet, Save, Trash2, Wand2, Database } from 'lucide-react';
import { toast } from 'sonner';
import importService from '../../services/imports';

const SCHEMAS = {
  students: ['first_name', 'last_name', 'email', 'student_id_number', 'cohort_id'],
  grades: ['evaluation_id', 'student_id', 'score', 'is_absent'],
  attendance: ['session_id', 'student_id', 'status'],
  modules: ['code', 'name', 'credits'],
  programs: ['name', 'department', 'degree_level'],
  cohorts: ['program_id', 'academic_year_id', 'name'],
  evaluations: ['cohort_module_id', 'title', 'type', 'weight_percentage', 'max_score', 'evaluation_date'],
  academic_years: ['name', 'start_date', 'end_date', 'is_current']
};

const normalizeHeader = (h) => {
  let clean = String(h).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
  const mappings = {
    'firstname': 'first_name', 'prenom': 'first_name',
    'lastname': 'last_name', 'nom': 'last_name',
    'studentid': 'student_id_number', 'matricule': 'student_id_number', 'student_number': 'student_id_number',
    'emailaddress': 'email', 'mail': 'email',
    'moduleid': 'module_id', 'programid': 'program_id', 'cohortid': 'cohort_id'
  };
  return mappings[clean] || clean;
};

const autoCleanValue = (header, value) => {
  if (!value) return '';
  let cleaned = String(value).trim();

  if (header === 'email') cleaned = cleaned.toLowerCase();
  if (header.startsWith('is_')) {
    const lower = cleaned.toLowerCase();
    cleaned = (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'vrai') ? 'True' : 'False';
  }
  return cleaned;
};

const ImportPage = () => {
  const [file, setFile] = useState(null);
  const [targetTable, setTargetTable] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [status, setStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [autoCorrections, setAutoCorrections] = useState(0);

  const validateRow = (rowData, requiredHeaders) => {
    const errors = [];
    requiredHeaders.forEach(header => {
      if (!rowData[header] || String(rowData[header]).trim() === '') {
        errors.push(`${header} is required`);
      }
    });
    if (rowData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
      errors.push('Invalid email format');
    }
    return errors;
  };

  const handleFileParse = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return toast.error('CSV is empty or missing data rows');

      const rawHeaders = lines[0].split(',').map(h => h.trim());
      const normalizedHeaders = rawHeaders.map(normalizeHeader);

      let bestMatch = null;
      let highestScore = 0;

      Object.entries(SCHEMAS).forEach(([table, schemaHeaders]) => {
        const matches = schemaHeaders.filter(h => normalizedHeaders.includes(h)).length;
        const score = matches / schemaHeaders.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = table;
        }
      });

      if (!bestMatch || highestScore < 0.3) {
        return toast.error('Could not detect schema. Please ensure headers match known tables.');
      }

      const activeSchema = SCHEMAS[bestMatch];
      setTargetTable(bestMatch);
      toast.success(`Auto-detected target table: ${bestMatch.toUpperCase()}`);

      let corrections = 0;
      const rows = lines.slice(1).map((line, rowIndex) => {
        const values = line.split(',').map(v => v.trim());
        const data = {};
        const isCleanedMap = {};

        activeSchema.forEach(schemaHeader => {
          const csvIndex = normalizedHeaders.indexOf(schemaHeader);
          let rawValue = csvIndex !== -1 ? values[csvIndex] : '';

          let cleanedValue = autoCleanValue(schemaHeader, rawValue);
          if (rawValue !== cleanedValue && rawValue !== '') {
            corrections++;
            isCleanedMap[schemaHeader] = true;
          }
          data[schemaHeader] = cleanedValue;
        });

        return { id: rowIndex, data, isCleanedMap, errors: validateRow(data, activeSchema) };
      });

      setParsedData(rows);
      setAutoCorrections(corrections);
      setStatus('editing');

      const missing = activeSchema.filter(h => !normalizedHeaders.includes(h));
      if (missing.length > 0) {
        toast.warning(`Missing columns injected automatically: ${missing.join(', ')}. Please fill them below.`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      handleFileParse(selectedFile);
    } else {
      toast.error('Please upload a valid .csv file');
    }
  };

  const handleCellEdit = (rowIndex, header, value) => {
    const updated = [...parsedData];
    updated[rowIndex].data[header] = value;
    updated[rowIndex].isCleanedMap[header] = false;
    updated[rowIndex].errors = validateRow(updated[rowIndex].data, SCHEMAS[targetTable]);
    setParsedData(updated);
  };

  const removeRow = (rowIndex) => {
    const updated = parsedData.filter((_, i) => i !== rowIndex);
    setParsedData(updated);
    if (updated.length === 0) reset();
  };

  const hasErrors = useMemo(() => parsedData.some(row => row.errors.length > 0), [parsedData]);

  const handleUpload = async () => {
    if (hasErrors) return toast.error('Please fix all errors marked in red.');

    try {
      setStatus('uploading');
      const headers = SCHEMAS[targetTable].join(',');
      const rows = parsedData.map(row => SCHEMAS[targetTable].map(h => row.data[h]).join(',')).join('\n');
      const finalFile = new File([new Blob([`${headers}\n${rows}`], { type: 'text/csv' })], file.name, { type: 'text/csv' });

      const response = await importService.uploadCSV(finalFile, targetTable, (progress) => {
        setUploadProgress(progress);
        if (progress === 100) setStatus('processing');
      });

      setResult(response);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      toast.error(error.response?.data?.detail || 'Import failed');
    }
  };

  const reset = () => {
    setFile(null); setTargetTable(null); setParsedData([]); setStatus('idle'); setUploadProgress(0); setResult(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main flex items-center gap-3">
            <FileSpreadsheet className="text-primary w-8 h-8" /> Smart Data Importer
          </h1>
          <p className="text-text-muted mt-2">Upload any CSV. The system will auto-detect the table, clean formatting, and map headers.</p>
        </div>
        {status === 'editing' && (
          <div className="flex items-center gap-3">
            <button onClick={reset} className="px-4 py-2 text-text-muted hover:text-text-main">Cancel</button>
            <button onClick={handleUpload} disabled={hasErrors} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${hasErrors ? 'bg-border text-text-muted cursor-not-allowed' : 'bg-primary text-white hover:scale-105 shadow-lg'}`}>
              <Save size={18} /> Sync to Database ({parsedData.length} rows)
            </button>
          </div>
        )}
      </div>

      {status === 'idle' && (
        <label className="border-2 border-dashed border-border rounded-3xl p-20 flex flex-col items-center justify-center bg-surface hover:bg-surface/80 transition-all cursor-pointer">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6"><Upload size={40} /></div>
          <p className="text-xl font-bold text-text-main">Drop any database CSV here</p>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
        </label>
      )}

      {status === 'editing' && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl animate-in fade-in">
          <div className="bg-background px-6 py-4 border-b flex justify-between items-center">
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full"><Database size={14} /> Target: {targetTable.toUpperCase()}</span>
              {autoCorrections > 0 && <span className="flex items-center gap-2 text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full"><Wand2 size={14} /> {autoCorrections} auto-corrections applied</span>}
            </div>
            <p className="text-xs text-text-muted">Red = Required/Error | Blue = Auto-Cleaned. Edit cells to fix.</p>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface/50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted">Status</th>
                  {SCHEMAS[targetTable].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-text-muted uppercase">{h}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedData.map((row, idx) => (
                  <tr key={row.id} className={row.errors.length > 0 ? 'bg-error/5' : 'hover:bg-primary/5'}>
                    <td className="px-4 py-3 relative group/tooltip">
                      {row.errors.length > 0 ? <AlertCircle className="text-error" size={18} /> : <CheckCircle2 className="text-success" size={18} />}
                      {row.errors.length > 0 && (
                        <div className="absolute left-10 top-0 hidden group-hover/tooltip:block bg-error text-white text-xs p-2 rounded z-50 whitespace-nowrap">
                          {row.errors.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                    </td>
                    {SCHEMAS[targetTable].map(h => (
                      <td key={h} className="px-4 py-2 border-r border-border/50">
                        <input type="text" value={row.data[h]} onChange={(e) => handleCellEdit(idx, h, e.target.value)}
                          className={`w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1 
                            ${row.errors.some(e => e.includes(h)) ? 'bg-error/10 text-error font-bold border border-error/50' :
                              row.isCleanedMap[h] ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200' : 'text-text-main'}`}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3"><button onClick={() => removeRow(idx)} className="text-text-muted hover:text-error"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="text-center py-20"><Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} /><p className="text-xl font-bold">Executing ETL...</p></div>
      )}

      {status === 'success' && (
        <div className="text-center py-20 bg-success/10 rounded-3xl border border-success/20">
          <CheckCircle2 className="text-success mx-auto mb-4" size={64} />
          <h2 className="text-3xl font-black text-success">Import Complete</h2>
          <p className="mt-2 text-success/80">{result.success_count} rows indexed into {targetTable}.</p>
          <button onClick={reset} className="mt-8 px-8 py-3 bg-success text-white font-bold rounded-xl shadow-lg hover:bg-success/90">Import More Data</button>
        </div>
      )}
    </div>
  );
};
export default ImportPage;