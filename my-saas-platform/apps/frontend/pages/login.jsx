import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function AuthPage() {
  const [tab, setTab] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Lead Genie</h1>
            <p className="text-muted-foreground">Scale Your Portfolio, Not Your Overhead.</p>
          </div>

          <div className="w-full space-y-6">
            <div className="flex gap-2 border-b border-border/30">
              <button 
                onClick={()=>setTab('signin')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${tab==='signin' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign In
              </button>
              <button 
                onClick={()=>setTab('signup')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${tab==='signup' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign Up
              </button>
            </div>
            
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm muted-text">Username</label>
                  <input 
                    value={username} 
                    onChange={(e)=>setUsername(e.target.value)} 
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition"
                    placeholder="your username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm muted-text">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e)=>setPassword(e.target.value)} 
                      className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-[0_0_20px_rgba(0,180,216,0.3)] hover:shadow-[0_0_30px_rgba(0,180,216,0.5)] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm muted-text">Organization Name</label>
                  <input 
                    value={orgName} 
                    onChange={(e)=>setOrgName(e.target.value)} 
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition"
                    placeholder="Your Organization"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm muted-text">Admin Username</label>
                  <input 
                    value={username} 
                    onChange={(e)=>setUsername(e.target.value)} 
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition"
                    placeholder="your username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm muted-text">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    className="w-full px-4 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition"
                    placeholder="••••••••"
                  />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-[0_0_20px_rgba(0,180,216,0.3)] hover:shadow-[0_0_30px_rgba(0,180,216,0.5)] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex w-1/2 relative bg-muted items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/10 via-background to-background opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
        
        <div className="relative z-10 max-w-lg space-y-8 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Lead Genie OS v2.0
            </div>
            
            <h2 className="text-5xl font-bold leading-tight text-white">
              Replace Your Entire <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-200">VA Team with AI</span>
            </h2>
            
            <p className="text-xl text-muted-foreground/80 leading-relaxed">
              The first autonomous operating system for Real Estate Investors. Replace manual prospecting with intelligent, 24/7 automation.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 text-left max-w-sm mx-auto">
              {[
                "AI Classification", "Inbound AI Calls", 
                "Smart Context", "Real-time Analytics"
              ].map((feature, i) => (
                <div key={i} className="flex items-center space-x-2 text-sm font-medium text-white/80">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
