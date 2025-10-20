const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { ObjectId } = require('mongodb')
const {
  insertUser,
  findUserByEmail,
  addBiometricDevice,
  findUserByDeviceKeyId,
  setDeviceChallenge,
  consumeDeviceChallenge,
} = require('../models/userModel')

const TOKEN_TTL_SECONDS = 60 * 60 * 24 // 24h

function signJwt(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL_SECONDS })
}

async function register(req, res) {
  try {
    console.log('register', req.body)
    const { email, password } = req.body || {}
    if (!email || !password) {

      return res.status(400).json({ error: 'email and password are required' })
    }

    const existing = await findUserByEmail(req.app.locals.db, email)
    if (existing) {
      return res.status(409).json({ error: 'email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    console.log('passwordHash', passwordHash)
    const user = await insertUser(req.app.locals.db, { email, passwordHash })
    console.log('user', user)
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
    console.error('biometricRegister error', err)
    return res.status(500).json({ error: 'internal error' })
  }
}

module.exports = { register, login }

// --------- BIOMETRICS ---------

function sha256Base64Url(input) {
  return crypto.createHash('sha256').update(input).digest('base64url')
}

function signJwt(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL_SECONDS })
}

function toPemIfNeeded(maybeBase64) {
  const str = String(maybeBase64 || '')
  if (str.includes('BEGIN PUBLIC KEY')) return str
  const wrapped = str.replace(/\n/g, '').match(/.{1,64}/g)?.join('\n') || str
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----\n`
}

async function biometricRegister(req, res) {
  try {
    const userId = req.user && req.user.userId
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const { publicKeyPem, platform, deviceName } = req.body || {}
    if (!publicKeyPem) return res.status(400).json({ error: 'publicKeyPem required' })

    const normalizedPem = toPemIfNeeded(publicKeyPem)
    const deviceKeyId = sha256Base64Url(normalizedPem)

    const db = req.app.locals.db
    const user = await findUserByEmail(db, req.user.email)
    if (!user) return res.status(404).json({ error: 'user not found' })

    const existingForAnyUser = await findUserByDeviceKeyId(db, deviceKeyId)
    if (existingForAnyUser && existingForAnyUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({ error: 'device already registered to another account' })
    }

    const alreadyOnUser = (user.biometricDevices || []).some(d => d.deviceKeyId === deviceKeyId)
    if (!alreadyOnUser) {
      await addBiometricDevice(db, user._id, {
        deviceKeyId,
        publicKeyPem: normalizedPem,
        platform: platform || 'unknown',
        deviceName: deviceName || 'device',
      })
    }

    return res.status(201).json({ deviceKeyId })
  } catch (err) {
    console.error('biometricChallenge error', err)
    return res.status(500).json({ error: 'internal error' })
  }
}

async function biometricChallenge(req, res) {
  try {
    const { deviceKeyId } = req.body || {}
    if (!deviceKeyId) return res.status(400).json({ error: 'deviceKeyId required' })

    const db = req.app.locals.db
    const user = await findUserByDeviceKeyId(db, deviceKeyId)
    if (!user) return res.status(404).json({ error: 'device not found' })

    const challenge = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes
    await setDeviceChallenge(db, deviceKeyId, challenge, expiresAt)
    return res.json({ challenge, expiresAt: expiresAt.toISOString() })
  } catch (err) {
    return res.status(500).json({ error: 'internal error' })
  }
}

async function biometricVerify(req, res) {
  try {
    const { deviceKeyId, challenge, signature } = req.body || {}
    if (!deviceKeyId || !challenge || !signature) {
      return res.status(400).json({ error: 'deviceKeyId, challenge, signature required' })
    }

    const db = req.app.locals.db
    const user = await findUserByDeviceKeyId(db, deviceKeyId)
    if (!user) return res.status(404).json({ error: 'device not found' })
    const device = (user.biometricDevices || []).find(d => d.deviceKeyId === deviceKeyId)
    if (!device) return res.status(404).json({ error: 'device not found' })
    const pending = device.pendingChallenge
    if (!pending) return res.status(400).json({ error: 'no pending challenge' })
    if (pending.challenge !== challenge) return res.status(400).json({ error: 'challenge mismatch' })
    if (new Date(pending.expiresAt).getTime() < Date.now()) return res.status(400).json({ error: 'challenge expired' })

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(challenge)
    verifier.end()
    const sigB64 = String(signature).replace(/-/g, '+').replace(/_/g, '/')
    const ok = verifier.verify(toPemIfNeeded(device.publicKeyPem), Buffer.from(sigB64, 'base64'))
    if (!ok) {
      console.error('biometricVerify invalid signature for deviceKeyId', deviceKeyId)
      return res.status(401).json({ error: 'signature invalid' })
    }

    await consumeDeviceChallenge(db, deviceKeyId)

    const token = signJwt({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET)
    const publicUser = { id: user._id.toString(), email: user.email }
    return res.json({ token, user: publicUser })
  } catch (err) {
    console.error('biometricVerify error', err)
    return res.status(500).json({ error: 'internal error' })
  }
}

module.exports.biometricRegister = biometricRegister
module.exports.biometricChallenge = biometricChallenge
module.exports.biometricVerify = biometricVerify


