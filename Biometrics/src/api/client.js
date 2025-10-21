import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_HOST = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
})

const STORAGE_KEY = 'api.baseUrl'

export async function getBaseUrl() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY)
  return stored || DEFAULT_HOST
}

export async function setBaseUrl(url) {
  await AsyncStorage.setItem(STORAGE_KEY, url)
}

async function request(path, { method = 'GET', token, body } = {}) {
  const baseUrl = await getBaseUrl()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const url = `${baseUrl}${path}`
  console.log('[API] request', method, url)
  const started = Date.now()
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch (e) {
    data = { raw: text }
  }
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    console.log('[API] error', method, url, 'status', res.status, 'timeMs', Date.now() - started, 'body', data)
    throw err
  }
  console.log('[API] success', method, url, 'timeMs', Date.now() - started)
  return data
}

export const api = {
  register: ({ email, password }) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password } }),
  biometricRegister: ({ token, publicKeyPem, platform, deviceName }) =>
    request('/auth/biometric/register', { method: 'POST', token, body: { publicKeyPem, platform, deviceName } }),
  biometricChallenge: ({ deviceKeyId }) =>
    request('/auth/biometric/challenge', { method: 'POST', body: { deviceKeyId } }),
  biometricVerify: ({ deviceKeyId, challenge, signature }) =>
    request('/auth/biometric/verify', { method: 'POST', body: { deviceKeyId, challenge, signature } }),
  biometricDeregister: ({ token, deviceKeyId }) =>
    request('/auth/biometric/deregister', { method: 'POST', token, body: { deviceKeyId } }),
  ping: () => request('/', { method: 'GET' }),
}


