import React from 'react';

type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  phone5?: string;
  email?: string;
  createdAt?: string;
  lastActivity?: string;
  tags?: string[];
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
};

type Props = {
  data: Contact[];
  page: number;
  pageSize: number;
  total: number;
  setPage: (n:number)=>void;
  setPageSize: (n:number)=>void;
  onSelect: (ids:string[])=>void;
};

export default function ContactTable({ data, page, pageSize, total, setPage, setPageSize, onSelect }: Props) {
  const [selected, setSelected] = React.useState<Record<string,boolean>>({});

  const toggle = (id:string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const applyBulk = () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    onSelect(ids);
  };

  return (
    <div className="p-4">
      <div className="overflow-x-auto bg-surface border border-border rounded">
        <table className="w-full table-auto">
          <thead className="bg-surface text-left text-xs muted-text">
            <tr>
              <th className="p-3"><input type="checkbox" onChange={(e)=>{ const checked = e.target.checked; const obj = {}; data.forEach(d=> obj[d.id]=checked); setSelected(obj); }} /></th>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Property Address</th>
              <th className="p-3">Mailing Address</th>
              <th className="p-3">Email</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id} className="border-t hover:bg-surface cursor-pointer">
                <td className="p-3"><input type="checkbox" checked={!!selected[c.id]} onChange={()=>toggle(c.id)} /></td>
                <td className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm`}>{(c.firstName||'').slice(0,1)}{(c.lastName||'').slice(0,1)}</div>
                  <div>
                    <div className="font-medium">{c.firstName} {c.lastName || ''}</div>
                  </div>
                </td>
                <td className="p-3">{
                  (() => {
                    const nums = [c.phone, c.phoneNumber, c.phone2, c.phone3, c.phone4, c.phone5].filter(Boolean)
                    if (!nums.length) return <span className="muted-text">—</span>
                    return <span>{nums[0]}<sup className="text-[10px] ml-1">{nums.length}</sup></span>
                  })()
                }</td>
                <td className="p-3 text-sm">
                  {(() => {
                    const parts = [c.propertyAddress, c.propertyCity, c.propertyState, c.propertyZip].filter(Boolean)
                    return parts.length ? <div className="max-w-xs truncate" title={parts.join(', ')}>{parts.join(', ')}</div> : <span className="muted-text">—</span>
                  })()}
                </td>
                <td className="p-3 text-sm">
                  {(() => {
                    const parts = [c.mailingAddress, c.mailingCity, c.mailingState, c.mailingZip].filter(Boolean)
                    return parts.length ? <div className="max-w-xs truncate" title={parts.join(', ')}>{parts.join(', ')}</div> : <span className="muted-text">—</span>
                  })()}
                </td>
                <td className="p-3 text-sm">{c.email || <span className="muted-text">—</span>}</td>
                <td className="p-3 text-xs muted-text">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
          <div>
          <button onClick={applyBulk} className="ghost-btn px-3 py-1 rounded">Apply to selected</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm muted-text">{page} of {Math.ceil(total / pageSize)} Pages</div>
          <select value={pageSize} onChange={(e)=>setPageSize(parseInt(e.target.value))} className="border rounded px-2 py-1">
            {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={()=>setPage(Math.max(1,page-1))} className="ghost-btn px-3 py-1 rounded">Prev</button>
            <button onClick={()=>setPage(page+1)} className="ghost-btn px-3 py-1 rounded">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
