import React from 'react';

type Props = {
  q: string;
  setQ: (s:string)=>void;
  onNew: ()=>void;
  onImport?: ()=>void;
  total: number;
};

export default function ContactToolbar({ q, setQ, onNew, onImport, total }: Props) {
  return (
    <div className="p-4 border-b border-border bg-surface flex items-center gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onNew} className="btn-primary px-3 py-2 rounded">+ New Contact</button>
        <button onClick={typeof onImport === 'function' ? onImport : undefined} className="ghost-btn px-3 py-2 rounded">Import Contacts</button>
        <button className="ghost-btn px-3 py-2 rounded">Bulk Actions</button>
        <button className="ghost-btn px-3 py-2 rounded">Settings</button>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        <div className="text-sm muted-text">Total {total} records</div>
        <div className="w-[320px]">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Quick search" className="w-full border border-border rounded px-3 py-2" />
        </div>
        <div className="muted-badge">More Filters</div>
      </div>
    </div>
  );
}
