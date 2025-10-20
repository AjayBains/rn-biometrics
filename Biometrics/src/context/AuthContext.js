import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import ReactNativeBiometrics from 'react-native-biometrics'
import { api } from '../api/client'
import { Platform } from 'react-native'

export const AuthContext = createContext(null)

const STORAGE_KEYS = {
  token: 'auth.token',
  email: 'auth.email',
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
      const [t, e] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.token),
        AsyncStorage.getItem(STORAGE_KEYS.email),
      ])
      if (t) setToken(t)
      if (e) setEmail(e)
      setInitializing(false)
    })()
  }, [])

  const saveSession = useCallback(async (nextToken, nextEmail) => {
    setToken(nextToken)
    setEmail(nextEmail)
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.token, nextToken || ''],
      [STORAGE_KEYS.email, nextEmail || ''],
    ])
  }, [])

  const clearSession = useCallback(async () => {
    setToken(null)
    setEmail(null)
    await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.email])
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
    if (!keysExist) {
      const { publicKey } = await rnBiometrics.createKeys()
      await AsyncStorage.setItem(STORAGE_KEYS.publicKeyPem, publicKey)
      return { created: true, publicKeyPem: publicKey }
    }
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.publicKeyPem)
    if (!existing) {
      const { publicKey } = await rnBiometrics.createKeys()
      await AsyncStorage.setItem(STORAGE_KEYS.publicKeyPem, publicKey)
      return { created: true, publicKeyPem: publicKey }
    }
    return { created: false, publicKeyPem: existing }
  }, [rnBiometrics])

  const enableBiometrics = useCallback(async () => {
    if (!token) throw new Error('not logged in')
    const { publicKeyPem } = await ensureBiometricKeys()
    const deviceName = Platform.OS
    const { deviceKeyId } = await api.biometricRegister({ token, publicKeyPem, platform: Platform.OS, deviceName })
    await AsyncStorage.setItem(STORAGE_KEYS.deviceKeyId, deviceKeyId)
    return { deviceKeyId }
  }, [token, ensureBiometricKeys])

  const biometricLogin = useCallback(async () => {
    const deviceKeyId = await AsyncStorage.getItem(STORAGE_KEYS.deviceKeyId)
    if (!deviceKeyId) throw new Error('biometrics not enabled on this device')
    const { available, biometryType } = await rnBiometrics.isSensorAvailable()
    if (!available) throw new Error('biometrics unavailable')
    const { challenge } = await api.biometricChallenge({ deviceKeyId })
    // Force biometric prompt (no device passcode) and sign challenge
    const { signature } = await rnBiometrics.createSignature({ promptMessage: 'Authenticate with Biometrics', payload: challenge })
    const res = await api.biometricVerify({ deviceKeyId, challenge, signature })
    await saveSession(res.token, res.user.email)
    return res
  }, [rnBiometrics, saveSession])

  const resetBiometrics = useCallback(async () => {
    try { await rnBiometrics.deleteKeys() } catch (e) {}
    await AsyncStorage.multiRemove([STORAGE_KEYS.deviceKeyId, STORAGE_KEYS.publicKeyPem])
  }, [rnBiometrics])

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


