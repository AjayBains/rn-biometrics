import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import * as Keychain from 'react-native-keychain'
import ReactNativeBiometrics from 'react-native-biometrics'
import { api } from '../api/client'
import { Platform } from 'react-native'

export const AuthContext = createContext(null)

const KEYCHAIN_SERVICES = {
  session: 'auth.session',
  deviceKeyId: 'bio.deviceKeyId',
  publicKeyPem: 'bio.publicKeyPem',
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [email, setEmail] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const rnBiometrics = useMemo(() => new ReactNativeBiometrics({ allowDeviceCredentials: false }), [])

  useEffect(() => {
    ;(async () => {
      try {
        const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICES.session })
        if (creds) {
          if (creds.password) setToken(creds.password)
          if (creds.username) setEmail(creds.username)
        }
      } catch (e) {
        console.warn('[Auth] failed to load session from keychain', e)
      }
      setInitializing(false)
    })()
  }, [])

  const saveSession = useCallback(async (nextToken, nextEmail) => {
    setToken(nextToken)
    setEmail(nextEmail)
    try {
      if (nextToken && nextEmail) {
        await Keychain.setGenericPassword(nextEmail, nextToken, { service: KEYCHAIN_SERVICES.session })
      } else {
        await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICES.session })
      }
    } catch (e) {
      console.warn('[Auth] failed to save session to keychain', e)
    }
  }, [])

  const clearSession = useCallback(async () => {
    setToken(null)
    setEmail(null)
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICES.session })
    } catch (e) {
      console.warn('[Auth] failed to clear session from keychain', e)
    }
  }, [])

  const register = useCallback(async ({ email, password }) => {
    console.log('register yar', email, password)
    const res = await api.register({ email, password })
    await saveSession(res.token, email)
    return res
  }, [saveSession])

  const login = useCallback(async ({ email, password }) => {
    const res = await api.login({ email, password })
    await saveSession(res.token, res.user.email)
    return res
  }, [saveSession])

  const logout = useCallback(async () => {
    await clearSession()
  }, [clearSession])

  const ensureBiometricKeys = useCallback(async () => {
    const { keysExist } = await rnBiometrics.biometricKeysExist()
    console.log('keysExist', keysExist)
    if (!keysExist) {
      const { publicKey } = await rnBiometrics.createKeys()
      await Keychain.setGenericPassword('publicKey', publicKey, { service: KEYCHAIN_SERVICES.publicKeyPem })
      return { created: true, publicKeyPem: publicKey }
    }
    const existingCreds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICES.publicKeyPem })
    const existing = existingCreds ? existingCreds.password : null
    if (!existing) {
      const { publicKey } = await rnBiometrics.createKeys()
      console.log('publicKey', publicKey)
      await Keychain.setGenericPassword('publicKey', publicKey, { service: KEYCHAIN_SERVICES.publicKeyPem })
      return { created: true, publicKeyPem: publicKey }
    }
    return { created: false, publicKeyPem: existing }
  }, [rnBiometrics])

  const enableBiometrics = useCallback(async () => {
    if (!token) throw new Error('not logged in')
    const { publicKeyPem } = await ensureBiometricKeys()
  console.log('publicKeyPem', publicKeyPem)
    const deviceName = Platform.OS
    const { deviceKeyId } = await api.biometricRegister({ token, publicKeyPem, platform: Platform.OS, deviceName })
    await Keychain.setGenericPassword('deviceKeyId', deviceKeyId, { service: KEYCHAIN_SERVICES.deviceKeyId })
    return { deviceKeyId }
  }, [token, ensureBiometricKeys])

  const biometricLogin = useCallback(async () => {
    const deviceKeyCreds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICES.deviceKeyId })
    console.log('deviceKeyCreds***', deviceKeyCreds)
    const deviceKeyId = deviceKeyCreds ? deviceKeyCreds.password : null
    console.log('deviceKeyId on trying to login', deviceKeyId)
    if (!deviceKeyId) throw new Error('biometrics not enabled on this device')
    const { available, biometryType } = await rnBiometrics.isSensorAvailable()
  console.log('available', available)
  console.log('biometryType', biometryType)
    if (!available) throw new Error('biometrics unavailable')
    const { challenge } = await api.biometricChallenge({ deviceKeyId })
    // Force biometric prompt (no device passcode) and sign challenge
    const { signature } = await rnBiometrics.createSignature({ promptMessage: 'Authenticate with Biometrics for katapult', payload: challenge })
    const res = await api.biometricVerify({ deviceKeyId, challenge, signature })
    await saveSession(res.token, res.user.email)
    return res
  }, [rnBiometrics, saveSession])

  const resetBiometrics = useCallback(async () => {
    const deviceKeyCreds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICES.deviceKeyId })
    const deviceKeyId = deviceKeyCreds ? deviceKeyCreds.password : null
    if (deviceKeyId && token) {
      try { await api.biometricDeregister({ token, deviceKeyId }) } catch (e) { /* ignore for local cleanup */ }
    }
    try { await rnBiometrics.deleteKeys() } catch (e) {}
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICES.deviceKeyId })
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICES.publicKeyPem })
    } catch (e) {
      console.warn('[Auth] failed to clear biometric data from keychain', e)
    }
  }, [rnBiometrics, token])

  const value = useMemo(() => ({
    token,
    email,
    initializing,
    register,
    login,
    logout,
    enableBiometrics,
    biometricLogin,
    resetBiometrics,
  }), [token, email, initializing, register, login, logout, enableBiometrics, biometricLogin, resetBiometrics])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


