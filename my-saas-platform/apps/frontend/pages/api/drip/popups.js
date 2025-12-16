import fs from 'fs'
import path from 'path'
const requireAuth = require('../../../lib/requireAuth')

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return
  try {
    const dripDir = path.join(process.cwd(), 'drip')
    const files = ['drip_select_popup.html','drip_messages_popup.html','edit_drip.html']
    let out = ''
    for (const f of files) {
      const p = path.join(dripDir, f)
      if (fs.existsSync(p)) out += fs.readFileSync(p, 'utf8')
    }
    res.setHeader('Content-Type', 'text/html')
    res.status(200).send(out)
  } catch (e) {
    console.error(e)
    res.status(500).send('error')
  }
}
