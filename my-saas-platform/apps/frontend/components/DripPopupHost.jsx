import React, { useEffect, useState } from 'react'

export default function DripPopupHost() {
  const [html, setHtml] = useState(null)
  const [leadId, setLeadId] = useState(null)

  useEffect(() => {
    function handler(e) {
      const detail = e?.detail || {}
      setHtml(detail.html || '')
      setLeadId(detail.leadId || null)
      document.body.style.overflow = 'hidden'
    }
    window.addEventListener('open-drip-popups', handler)
    return () => {
      window.removeEventListener('open-drip-popups', handler)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!html) return
    const host = document.getElementById('drip-popup-host')

    function onClick(e) {
      const btn = e.target.closest && e.target.closest('[data-drip-id]')
      if (!btn) return
      const dripId = btn.getAttribute('data-drip-id')
      if (!dripId || !leadId) return

      fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'drip' }),
      })
        .then(r => {
          if (!r.ok) throw new Error('Failed to assign drip')
          close()
        })
        .catch(err => {
          console.error(err)
          close()
        })
    }

    host && host.addEventListener('click', onClick)
    return () => host && host.removeEventListener('click', onClick)
  }, [html, leadId])

  function close() {
    setHtml(null)
    setLeadId(null)
    document.body.style.overflow = ''
  }

  if (!html) return null

  return (
    <div id="drip-popup-host" className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative bg-white p-6 rounded-lg shadow-lg max-w-[95vw] max-h-[90vh] overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
