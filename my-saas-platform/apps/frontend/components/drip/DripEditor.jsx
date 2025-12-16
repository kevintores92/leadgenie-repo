import React, { useState, useEffect } from 'react'

function MessageCard({ idx, msg, onChange, onRemove }) {
  return (
    <div className="drip-card p-4 mb-4 bg-gray-50 border rounded">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Message {idx + 1}</h4>
        <button onClick={() => onRemove(idx)} className="text-sm text-red-600">Remove</button>
      </div>
      <label className="block text-sm mb-2">Send on day
        <input type="number" min="1" value={msg.day} onChange={e => onChange(idx, { ...msg, day: Number(e.target.value) })} className="ml-2 w-20" />
      </label>
      <textarea value={msg.text} onChange={e => onChange(idx, { ...msg, text: e.target.value })} className="w-full p-2 border rounded" rows={4} />
    </div>
  )
}

export default function DripEditor({ onClose }) {
  const [name, setName] = useState('')
  const [messages, setMessages] = useState([])

  useEffect(() => { if (messages.length === 0) addMessage() }, [])

  function addMessage() {
    setMessages(prev => [...prev, { day: 1, text: '' }])
  }

  function updateMessage(i, val) {
    setMessages(prev => prev.map((m, idx) => idx === i ? val : m))
  }

  function removeMessage(i) {
    setMessages(prev => prev.filter((_, idx) => idx !== i))
  }

  function save() {
    if (!name.trim()) return alert('Name required')
    if (messages.some(m => m.text.trim().length < 8)) return alert('Each message needs at least 8 characters')
    // For now persist to localStorage as a simple demo
    const out = { id: Date.now().toString(), name, messages }
    const existing = JSON.parse(localStorage.getItem('drips') || '[]')
    existing.push(out)
    localStorage.setItem('drips', JSON.stringify(existing))
    // Show success and close after a brief delay
    alert('Drip automation created successfully!')
    onClose && onClose()
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">New Drip Automation</h2>
        <button onClick={onClose} className="text-gray-600">Close</button>
      </div>
      <div className="mb-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Drip Automation Name" className="w-full p-2 border rounded" />
      </div>

      <div id="messagesContainer">
        {messages.map((m, i) => (
          <MessageCard key={i} idx={i} msg={m} onChange={updateMessage} onRemove={removeMessage} />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={addMessage} className="px-4 py-2 border rounded">＋ Add Message</button>
        <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded">Save Drip</button>
      </div>
    </div>
  )
}
