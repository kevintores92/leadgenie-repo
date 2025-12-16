import React from 'react';
import AppShell from '../../components/AppShell';

const mockTemplates = [
  { id: 't1', name: 'Welcome', message: 'Hi {firstName}, check out {propertyAddress}', delivery: '85%', response: '12%', date: '2025-12-10' },
  { id: 't2', name: 'Reminder', message: 'Reminder: {propertyAddress} needs attention', delivery: '78%', response: '8%', date: '2025-12-01' },
  { id: 't3', name: 'Alt A', message: 'Hello, we have info about your property', delivery: '60%', response: '4%', date: '2025-11-22' }
];

export default function TemplatesPage(){
  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <button disabled className="bg-blue-200 text-white px-4 py-2 rounded opacity-60 cursor-not-allowed">+ Create New</button>
        </div>

        <div className="card rounded shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Message</th>
                <th className="text-left px-4 py-3">Delivery %</th>
                <th className="text-left px-4 py-3">Response %</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockTemplates.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-surface' : 'bg-surface'}>
                  <td className="px-4 py-3">{t.name}</td>
                  <td className="px-4 py-3">{t.message}</td>
                  <td className="px-4 py-3">{t.delivery}</td>
                  <td className="px-4 py-3">{t.response}</td>
                  <td className="px-4 py-3">{t.date}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => alert('Edit clicked')} className="text-primary mr-3">Edit</button>
                    <button onClick={() => alert('Delete clicked')} className="text-destructive">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
