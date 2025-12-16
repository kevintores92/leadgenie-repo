import React, { useState } from 'react'
import { useRouter } from 'next/router'

export default function AuthPage() {
  const [tab, setTab] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSignIn(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Login failed')
      router.push('/organization')
    } catch (e) {
      setError(e.message)
    } finally { setSubmitting(false) }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, username, password })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Signup failed')
      router.push('/organization')
    } catch (e) {
      setError(e.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-6 bg-surface border border-border rounded shadow">
        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 ${tab==='signin' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setTab('signin')}>Sign in</button>
          <button className={`px-4 py-2 ${tab==='signup' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setTab('signup')}>Create org</button>
        </div>

        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="grid gap-3">
            <label className="block text-sm muted-text">Username</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full p-2 border rounded" />
            <label className="block text-sm muted-text">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-2 border rounded" />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="pt-2">
              <button className="px-4 py-2 btn-primary" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
            </div>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="grid gap-3">
            <label className="block text-sm muted-text">Organization Name</label>
            <input value={orgName} onChange={(e)=>setOrgName(e.target.value)} className="w-full p-2 border rounded" />
            <label className="block text-sm muted-text">Admin Username</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full p-2 border rounded" />
            <label className="block text-sm muted-text">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-2 border rounded" />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="pt-2">
              <button className="px-4 py-2 btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
