const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const COOKIE_NAME = 'genie_session'

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return null
  }
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10)
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash)
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production'
  const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${secure ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`)
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_NAME,
}
