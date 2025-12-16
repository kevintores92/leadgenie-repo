import React, { useEffect, useState } from 'react';
import ContactToolbar from './ContactToolbar';
import ContactTable from './ContactTable';
import ContactModal from './ContactModal';
import ImportContactsModal from './ImportContactsModal';

export default function ContactsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState([] as any[]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchPage = async () => {
    setLoading(true);
    const res = await fetch(`/api/contacts?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setData(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  };

  useEffect(()=>{ fetchPage(); }, [page, pageSize, q]);

  const onCreate = async (payload:any) => {
    await fetch('/api/contacts', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) });
    setPage(1);
    fetchPage();
  };

  const onBulk = async (ids:string[]) => {
    if (!ids.length) return alert('No items selected');
    await fetch('/api/contacts', { method: 'DELETE', headers: { 'content-type':'application/json' }, body: JSON.stringify({ ids }) });
    setPage(1);
    fetchPage();
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <ContactToolbar q={q} setQ={setQ} onNew={()=>setModalOpen(true)} onImport={()=>setImportOpen(true)} total={total} />
      {loading && <div className="p-6">Loading...</div>}
      {!loading && (
        <ContactTable data={data} page={page} pageSize={pageSize} total={total} setPage={setPage} setPageSize={setPageSize} onSelect={onBulk} />
      )}

      <ContactModal open={modalOpen} onClose={()=>setModalOpen(false)} onCreate={onCreate} />
      <ImportContactsModal open={importOpen} onClose={()=>setImportOpen(false)} />
    </div>
  );
}
