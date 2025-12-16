import React, { useState } from 'react'
import { useRouter } from 'next/router'

export default function SignupPage() {
  const [orgName, setOrgName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, username, password }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Signup failed')
      localStorage.setItem('app_user', JSON.stringify(j.user))
      localStorage.setItem('app_org', JSON.stringify(j.org))
      router.push('/organization')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-surface border border-border rounded shadow">
        <h1 className="text-lg font-semibold mb-4">Create Organization</h1>
        <label className="block text-sm muted-text mb-2">Organization Name</label>
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full p-2 border rounded mb-4" />

        <label className="block text-sm muted-text mb-2">Admin Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border rounded mb-4" />

        <label className="block text-sm muted-text mb-2">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" />

        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

        <div className="flex items-center justify-between">
          <button className="px-4 py-2 btn-primary">Create</button>
          <a href="/login" className="text-sm text-primary">Sign in</a>
        </div>
      </form>
    </div>
  )
}
