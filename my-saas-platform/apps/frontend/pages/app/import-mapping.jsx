"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// lightweight CSV parser (same as modal)
function parseCsvLine(line) {
  const out = [];
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

function parseCsvHeaders(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  return parseCsvLine(lines[0]);
}

const DATABASE_FIELDS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'phoneNumber', label: 'Phone Number' },
  { value: 'phone2', label: 'Phone 2' },
  { value: 'phone3', label: 'Phone 3' },
  { value: 'phone4', label: 'Phone 4' },
  { value: 'phone5', label: 'Phone 5' },
  { value: 'propertyAddress', label: 'Property Address' },
  { value: 'propertyCity', label: 'City' },
  { value: 'propertyState', label: 'State' },
  { value: 'propertyZip', label: 'Zip' },
  { value: 'mailingAddress', label: 'Mailing Address' },
  { value: 'mailingCity', label: 'Mailing City' },
  { value: 'mailingState', label: 'Mailing State' },
  { value: 'mailingZip', label: 'Mailing Zip' },
  ...Array.from({ length: 10 }).map((_, i) => ({ value: `custom${i+1}`, label: `Custom ${i+1}` }))
];

export default function ImportMappingPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const txt = sessionStorage.getItem('import_csv_text') || '';
      setCsvText(txt);
      const detected = parseCsvHeaders(txt);
      setHeaders(detected);
      const lines = txt.split(/\r?\n/).filter(l => l.trim() !== '');
      const rows = lines.slice(1, 6).map(l => parseCsvLine(l));
      setPreviewRows(rows);
      const m = {};
      DATABASE_FIELDS.forEach(d => (m[d.value] = ''));
      setMapping(m);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const updateMapping = (dbField, header) => setMapping(prev => ({ ...prev, [dbField]: header }));

  const goBack = () => router.back();

  const cancel = () => {
    sessionStorage.removeItem('import_csv_text');
    sessionStorage.removeItem('import_file_name');
    router.push('/app/contacts');
  };

  const saveMapping = async () => {
    if (!mapping.phone) return alert('Please map a column to Phone before saving.');
    if (!csvText) return alert('No CSV data found.');
    setLoading(true);
    try {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
      const hdrs = parseCsvLine(lines[0] || '');
      const rawRows = lines.slice(1).map(l => {
        const vals = parseCsvLine(l);
        const obj = {};
        hdrs.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return obj;
      });

      const mappedRows = rawRows.map(rr => {
        const out = {};
        for (const dbField of Object.keys(mapping)) {
          const headerName = mapping[dbField];
          if (!headerName) continue;
          out[dbField] = rr[headerName];
        }
        return out;
      });

      const resp = await fetch('/api/contacts/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rows: mappedRows }) });
      const jb = await resp.json();
      if (!resp.ok) throw new Error(jb.error || 'Import failed');
      alert(`Imported ${jb.importedCount || 0} rows`);
      sessionStorage.removeItem('import_csv_text');
      router.push('/app/contacts');
    } catch (e) {
      alert('Import failed: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Map Columns</h1>
            <div className="text-sm muted-text">Map your uploaded CSV columns to the app fields.</div>
          </div>
          <div className="flex gap-2">
            <button onClick={goBack} className="ghost-btn px-3 py-2 rounded">Back</button>
            <button onClick={cancel} className="ghost-btn px-3 py-2 rounded">Cancel</button>
          </div>
        </div>

        <div className="bg-surface rounded border border-border p-4">
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full table-fixed">
              <thead className="bg-surface text-sm muted-text sticky top-0">
                <tr>
                  <th className="w-1/2 px-4 py-3 text-left font-semibold">Database Field</th>
                  <th className="w-1/2 px-4 py-3 text-left font-semibold">Uploaded Field</th>
                </tr>
              </thead>
              <tbody>
                {DATABASE_FIELDS.map((df, idx) => {
                  const selectedHeaders = Object.values(mapping).filter(Boolean);
                  const current = mapping[df.value] || '';
                  const options = headers.filter(h => current === h || !selectedHeaders.includes(h));
                  const isUnmapped = !current;
                  return (
                    <tr key={df.value} className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface'}>
                      <td className="px-4 py-3 align-top truncate text-sm text-foreground" title={df.label}>{df.label}</td>
                      <td className="px-4 py-3">
                        <label className="sr-only">Map {df.label}</label>
                        <select value={current} onChange={(e) => updateMapping(df.value, e.target.value)} className={`w-full rounded px-3 py-2 text-sm border ${isUnmapped ? 'border-red-300 bg-red-50' : 'border-border bg-surface'} focus:outline-none focus:ring-2 focus:ring-green-300`}>
                          <option value="">-- Skip / none --</option>
                          {options.map(h => (<option key={h} value={h}>{h}</option>))}
                        </select>
                        {isUnmapped && <div className="text-xs text-red-600 mt-1">Required</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => { sessionStorage.removeItem('import_csv_text'); router.push('/app/contacts'); }} className="ghost-btn px-4 py-2 rounded">Cancel</button>
          <button onClick={saveMapping} disabled={loading} className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'btn-primary'}`}>{loading ? 'Saving...' : 'Save & Import'}</button>
        </div>
      </div>
    </div>
  );
}
