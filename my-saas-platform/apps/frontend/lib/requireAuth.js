const { verifyToken, COOKIE_NAME } = require('./auth')

function parseCookies(req) {
  const raw = req.headers.cookie || ''
  return raw.split(';').map(c=>c.trim()).reduce((acc, cur)=>{
    const [k,v] = cur.split('=')
    if (k) acc[k]=v
    return acc
  }, {})
}

async function requireAuth(req, res) {
  const cookies = parseCookies(req)
  const token = cookies[COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: 'unauthenticated' })
    return null
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'invalid token' })
    return null
  }
  return payload
}

module.exports = requireAuth
