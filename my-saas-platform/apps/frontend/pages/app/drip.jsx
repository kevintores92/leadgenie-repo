import React, { useState } from 'react'
import DripEditor from '../../components/drip/DripEditor'

export default function DripPage() {
  const [showEditor, setShowEditor] = useState(false)

  return (
    <div className="min-h-screen">
      <div className="h-16" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Drip Automations</h1>
          <button onClick={() => setShowEditor(true)} className="bg-blue-600 text-white px-4 py-2 rounded">＋ New Drip</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="card p-4">
              <p className="text-neutral-600">Drip list is not yet connected to backend. Use the editor to create a local drip automation.</p>
            </div>
          </div>
          <aside className="md:col-span-1">
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Quick Create</h3>
              <p className="text-sm text-neutral-600">Open the editor to compose messages and save locally.</p>
              <div className="mt-4">
                <button onClick={() => setShowEditor(true)} className="w-full border border-neutral-300 text-neutral-700 px-4 py-2 rounded">Open Editor</button>
              </div>
            </div>
          </aside>
        </div>

        {showEditor && <div className="mt-6"><DripEditor onClose={() => setShowEditor(false)} /></div>}
      </div>
    </div>
  )
}
