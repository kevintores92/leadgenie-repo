import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';

// A small, robust CSV header parser (handles quoted fields).
function parseCsvLine(line: string) {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseCsvHeaders(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  return parseCsvLine(lines[0]);
}

type Mapping = Record<string, string>;

// Database fields (static) that users map to. Left column shows these.
const DATABASE_FIELDS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'propertyAddress', label: 'Address' },
  { value: 'propertyCity', label: 'City' },
  { value: 'propertyState', label: 'State' },
  { value: 'propertyZip', label: 'Zip' },
  { value: 'mailingAddress', label: 'Mailing Address' },
  { value: 'mailingCity', label: 'Mailing City' },
  { value: 'mailingState', label: 'Mailing State' },
  { value: 'mailingZip', label: 'Mailing Zip' },
  { value: 'phone', label: 'Phone 1' },
  { value: 'phone2', label: 'Phone 2' },
  { value: 'phone3', label: 'Phone 3' },
  { value: 'phone4', label: 'Phone 4' },
  { value: 'phone5', label: 'Phone 5' },
  ...Array.from({ length: 10 }).map((_, i) => ({ value: `custom${i+1}`, label: `Custom ${i+1}` }))
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Detected headers and preview rows (preview minimal)
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [csvText, setCsvText] = useState<string>('');

  // Mapping state: databaseFieldValue -> selected file header
  const [mapping, setMapping] = useState<Mapping>({});

  // Loading / other UI state
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Validate and load file (CSV or XLSX)
  const handleFile = async (f: File | null) => {
    setFileError(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setFile(null);

    if (!f) return;

    // Validate size
    if (f.size > MAX_FILE_SIZE) {
      setFileError('File too large (max 5MB)');
      return;
    }

    // Validate type by name/ MIME
    const name = f.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || f.type === 'text/csv';
    const isXlsx = name.endsWith('.xlsx') || f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isCsv && !isXlsx) {
      setFileError('Unsupported format. Please upload a CSV or XLSX file.');
      return;
    }

    setFile(f);

    try {
      if (isCsv) {
        // Read as text for CSV and parse headers + a few preview rows
        const txt = await f.text();
        setCsvText(txt);
        const detected = parseCsvHeaders(txt);
        setHeaders(detected);

        // build preview rows (first 5 rows)
        const lines = txt.split(/\r?\n/).filter(l => l.trim() !== '');
        const rows: string[][] = lines.slice(1, 6).map(l => parseCsvLine(l));
        setPreviewRows(rows);

        // initialize mapping: each database field -> empty
        const m: Mapping = {};
        DATABASE_FIELDS.forEach(d => (m[d.value] = ''));
        setMapping(m);
      } else {
        // XLSX handling: dynamic import sheetjs. If not available show error.
        // This keeps bundle small if XLSX support is optional.
        try {
          // @ts-ignore - dynamic import
          const XLSX = await import('xlsx');
          const ab = await f.arrayBuffer();
          const wb = XLSX.read(ab, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          setCsvText(csv);
          const detected = parseCsvHeaders(csv);
          setHeaders(detected);

          const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
          const rows: string[][] = lines.slice(1, 6).map(l => parseCsvLine(l));
          setPreviewRows(rows);

          const m: Mapping = {};
          DATABASE_FIELDS.forEach(d => (m[d.value] = ''));
          setMapping(m);
        } catch (e) {
          setFileError('Failed to parse XLSX. Please ensure the app has the "xlsx" package installed.');
          setFile(null);
        }
      }
    } catch (e: any) {
      setFileError('Failed to read file: ' + (e?.message || String(e)));
      setFile(null);
    }
  };

  // Remove file and reset states
  const removeFile = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Handle drop events on the drag zone
  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const dt = ev.dataTransfer;
    const f = dt.files && dt.files[0];
    handleFile(f ?? null);
  };

  // Update mapping for a given database field
  const updateMapping = (dbField: string, header: string) => {
    setMapping(prev => ({ ...prev, [dbField]: header }));
  };

  // Save mapping action - POST mapping to backend. Requires phone mapping.
  const saveMapping = async () => {
    // Ensure phone mapped to something (database field key 'phone')
    if (!mapping['phone']) return alert('Please map a column to Phone before saving.');

    if (!file) return alert('No file to import');
    setLoading(true);

    try {
      // Build raw rows from file
      let rawRows: Record<string,string>[] = [];
      const name = file.name.toLowerCase();
      const isCsv = name.endsWith('.csv') || file.type === 'text/csv';
      const isXlsx = name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      if (isCsv) {
        const txt = await file.text();
        const lines = txt.split(/\r?\n/).filter(l => l.trim() !== '');
        const hdrs = parseCsvLine(lines[0] || '');
        rawRows = lines.slice(1).map(l => {
          const vals = parseCsvLine(l);
          const obj: Record<string,string> = {};
          hdrs.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
          return obj;
        });
      } else if (isXlsx) {
        // @ts-ignore
        const XLSX = await import('xlsx');
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
        const hdrs = parseCsvLine(lines[0] || '');
        rawRows = lines.slice(1).map(l => {
          const vals = parseCsvLine(l);
          const obj: Record<string,string> = {};
          hdrs.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
          return obj;
        });
      }

          // Map rawRows to canonical keys using mapping (dbField -> headerName)
          const mappedRows = rawRows.map(rr => {
            const out: Record<string, any> = {};
            for (const dbField of Object.keys(mapping)) {
              const headerName = mapping[dbField];
              if (!headerName) continue;
              out[dbField] = rr[headerName];
            }
            return out;
          });

      // Post to import API
      const resp = await fetch('/api/contacts/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: mappedRows }) });
      const jb = await resp.json();
      if (!resp.ok) {
        const errorMsg = jb.error || `Import failed with status ${resp.status}`;
        throw new Error(errorMsg);
      }
      const message = `Successfully imported ${jb.importedCount || 0} contact(s)`;
      const warnings = jb.warnings && jb.warnings.length > 0 
        ? `\n\nWarnings:\n${jb.warnings.slice(0, 3).join('\n')}${jb.warnings.length > 3 ? `\n... and ${jb.warnings.length - 3} more` : ''}`
        : '';
      alert(message + warnings);
      removeFile();
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || 'Unknown error occurred';
      alert('Error importing contacts:\n\n' + errorMessage);
      console.error('Import error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Download a simple CSV template based on DATABASE_FIELDS labels
  const downloadTemplate = () => {
    const header = DATABASE_FIELDS.map(d => d.label).join(',');
    const sample = DATABASE_FIELDS.map(() => '').join(',');
    const csv = header + '\n' + sample + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const router = useRouter();

  if (!open) return null;

  const openMappingPage = () => {
    try {
      // persist csv text so mapping page can reconstruct headers/rows
      if (csvText) {
        sessionStorage.setItem('import_csv_text', csvText);
        sessionStorage.setItem('import_file_name', file?.name || 'import.csv');
        router.push('/app/import-mapping');
      } else {
        alert('No parsed file available for mapping.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to open mapping page');
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div onClick={(e) => e.stopPropagation()} className="w-[70vw] h-[80vh] rounded-xl overflow-hidden bg-surface border border-border">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700">
          <h3 className="text-lg font-semibold text-white">Upload & Map File Headers</h3>
          <p className="text-green-100 text-sm">Drag & drop a CSV/XLSX file, then map the file headers to your app fields.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* File upload zone with drop and browse */}
          <div>
            <label className="block text-sm font-medium muted-text mb-2">File</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
              className="relative rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              aria-label="File drop zone"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="text-sm muted-text">Drag & drop a CSV or XLSX file here</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="px-3 py-2 rounded ghost-btn text-sm font-medium"
                  >
                    Browse
                  </button>
                  <div className="text-xs muted-text">Max 5MB • CSV, XLSX</div>
                </div>
              </div>
              {/* Hidden native file input */}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                aria-label="Choose file to upload"
              />
            </div>

            {/* File errors */}
            {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}

            {/* File preview */}
            {file && (
              <div className="mt-4 flex items-start justify-between gap-4 bg-surface p-4 rounded">
                <div>
                  <div className="text-sm font-medium text-foreground">{file.name}</div>
                  <div className="text-sm muted-text">{file.type || 'Unknown type'} • {(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={removeFile} className="px-3 py-2 ghost-btn text-red-700 rounded border-red-100 text-sm">Remove file</button>
                </div>
              </div>
            )}
          </div>

          {/* Mapping moved to a dedicated page to allow larger layout and better UX */}
          {headers.length > 0 && (
            <div>
              <label className="block text-sm font-medium muted-text mb-2">Header Mapping</label>
              <div className="bg-surface p-4 rounded border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Detected columns: {headers.length}</div>
                    <div className="text-xs muted-text">Preview {previewRows.length} rows • {file?.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={openMappingPage} className="btn-primary px-3 py-2 rounded text-sm">Open Mapping Page</button>
                    <button onClick={removeFile} className="ghost-btn px-3 py-2 rounded text-sm">Remove File</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview rows (minimal) */}
          {previewRows.length > 0 && (
            <div>
              <label className="block text-sm font-medium muted-text mb-2">Preview</label>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs muted-text">
                    <tr>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-surface">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-surface'}>
                        {headers.map((h, j) => (
                          <td key={String(j)} className="px-3 py-2 align-top whitespace-pre-wrap max-w-[220px] overflow-hidden text-ellipsis">{r[j] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2">
              <button onClick={downloadTemplate} className="ghost-btn px-4 py-2 rounded text-sm">Download Template</button>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded ghost-btn">Cancel</button>
              <button onClick={saveMapping} disabled={loading || headers.length === 0} className={`px-4 py-2 rounded text-white ${loading || headers.length === 0 ? 'bg-gray-400' : 'btn-primary'}`}>
                {loading ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
