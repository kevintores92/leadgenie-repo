import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function OrganizationPage() {
  const [org, setOrg] = useState(null)
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/login')
          return
        }
        const j = await res.json()
        setOrg(j.org)
        const usersRes = await fetch(`/api/organizations/${j.org.id}/users`)
        if (!usersRes.ok) {
          setUsers([])
        } else {
          const usersJson = await usersRes.json()
          setUsers(usersJson.users || [])
        }
      } catch (e) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault(); setError(null)
    const username = newUser.trim()
    if (!username) {
      setError('Please enter a username')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}/subaccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `Server error (${res.status})`)
      setUsers((s)=>[...s, j.user])
      setNewUser('')
    } catch (e) { setError(e.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!org) return null

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Organization: {org.name}</h2>
      <div className="mt-4">
        <h3 className="font-medium">Users</h3>
        <ul className="mt-2">
          {users.map(u=> <li key={u.id} className="py-1">{u.username} <span className="text-xs muted-text">{u.id}</span></li>)}
        </ul>
      </div>

      <form onSubmit={handleCreate} className="mt-6 max-w-md">
        <label className="block text-sm muted-text mb-2">Create Sub-account (username)</label>
        <input value={newUser} onChange={(e)=>setNewUser(e.target.value)} disabled={submitting} className="w-full p-2 border rounded mb-2" />
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <button type="submit" className="px-3 py-2 btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  )
}
