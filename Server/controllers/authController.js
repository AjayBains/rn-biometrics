const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { insertUser, findUserByEmail } = require('../models/userModel')

const TOKEN_TTL_SECONDS = 60 * 60 * 24 // 24h

function signJwt(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL_SECONDS })
}

async function register(req, res) {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const existing = await findUserByEmail(req.app.locals.db, email)
    if (existing) {
      return res.status(409).json({ error: 'email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await insertUser(req.app.locals.db, { email, passwordHash })

    const token = signJwt({ sub: user._id.toString(), email }, process.env.JWT_SECRET)
    return res.status(201).json({ token })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'email already registered' })
    }
    return res.status(500).json({ error: 'internal error' })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const user = await findUserByEmail(req.app.locals.db, email)
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' })
    }

    const token = signJwt({ sub: user._id.toString(), email }, process.env.JWT_SECRET)
    const publicUser = { id: user._id.toString(), email: user.email }
    return res.json({ token, user: publicUser })
  } catch (err) {
    return res.status(500).json({ error: 'internal error' })
  }
}

module.exports = { register, login }


