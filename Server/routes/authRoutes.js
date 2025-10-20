const express = require('express')
const {
  register,
  login,
  biometricRegister,
  biometricChallenge,
  biometricVerify,
} = require('../controllers/authController')
const jwt = require('jsonwebtoken')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)

// simple JWT auth middleware for routes requiring logged-in user
router.use((req, res, next) => {
  if (req.path === '/biometric/challenge' || req.path === '/biometric/verify') {
    return next()
  }
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next()
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { userId: decoded.sub, email: decoded.email }
  } catch (e) {}
  return next()
})

// Biometric registration requires logged-in user
router.post('/biometric/register', (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' })
  return biometricRegister(req, res, next)
})

// Biometric login challenge + verify
router.post('/biometric/challenge', biometricChallenge)
router.post('/biometric/verify', biometricVerify)

module.exports = router


