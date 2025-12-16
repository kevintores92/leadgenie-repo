import React from 'react';

type Props = { open: boolean; onClose: ()=>void; onCreate: (payload:any)=>void };

export default function ContactModal({ open, onClose, onCreate }: Props) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');

  const submit = () => {
    onCreate({ firstName, lastName, email, phone });
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="card w-[520px] rounded p-5">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Add Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="First name" className="border p-2" />
          <input value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Last name" className="border p-2" />
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="border p-2 col-span-2" />
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="border p-2 col-span-2" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 ghost-btn rounded">Cancel</button>
          <button onClick={submit} className="px-3 py-1 btn-primary rounded">Create</button>
        </div>
      </div>
    </div>
  );
}
