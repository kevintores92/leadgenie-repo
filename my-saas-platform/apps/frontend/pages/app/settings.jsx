import fs from 'fs'
import path from 'path'

export async function getServerSideProps() {
  const settingsDir = path.join(process.cwd(), 'settings')
  const files = ['index','team','billing','plan','usage','notifications','audit','security']
  const content = {}
  for (const name of files) {
    const p = path.join(settingsDir, `${name}.html`)
    try { content[name] = fs.readFileSync(p, 'utf8') } catch (e) { content[name] = `<div>Missing ${name}</div>` }
  }
  return { props: { content } }
}

export default function SettingsPage({ content }) {
  return (
    <div className="min-h-screen">
      <div className="h-16" />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <aside className="md:col-span-1">
              <nav className="flex flex-col gap-2">
                <a href="#overview" className="p-2 rounded hover:bg-surface">Overview</a>
                <a href="#team" className="p-2 rounded hover:bg-surface">Team & Roles</a>
                <a href="#billing" className="p-2 rounded hover:bg-surface">Billing & Wallet</a>
                <a href="#plan" className="p-2 rounded hover:bg-surface">Plans</a>
                <a href="#usage" className="p-2 rounded hover:bg-surface">Usage & Analytics</a>
                <a href="#notifications" className="p-2 rounded hover:bg-surface">Notifications</a>
                <a href="#audit" className="p-2 rounded hover:bg-surface">Audit Log</a>
                <a href="#security" className="p-2 rounded hover:bg-surface">Security</a>
              </nav>
            </aside>
            <main className="md:col-span-3">
              <section id="overview" className="mb-6" dangerouslySetInnerHTML={{ __html: content.index }} />
              <section id="team" className="mb-6" dangerouslySetInnerHTML={{ __html: content.team }} />
              <section id="billing" className="mb-6" dangerouslySetInnerHTML={{ __html: content.billing }} />
              <section id="plan" className="mb-6" dangerouslySetInnerHTML={{ __html: content.plan }} />
              <section id="usage" className="mb-6" dangerouslySetInnerHTML={{ __html: content.usage }} />
              <section id="notifications" className="mb-6" dangerouslySetInnerHTML={{ __html: content.notifications }} />
              <section id="audit" className="mb-6" dangerouslySetInnerHTML={{ __html: content.audit }} />
              <section id="security" className="mb-6" dangerouslySetInnerHTML={{ __html: content.security }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

