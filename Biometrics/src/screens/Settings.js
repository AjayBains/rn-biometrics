import React, { useContext, useEffect, useState } from 'react'
import { View, Text, Button, StyleSheet, Switch, TextInput } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthContext } from '../context/AuthContext'
import { getBaseUrl, setBaseUrl, api } from '../api/client'
const STORAGE_KEY = 'bio.deviceKeyId'

export default function Settings() {
  const { enableBiometrics, resetBiometrics } = useContext(AuthContext)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [baseUrl, setBaseUrlState] = useState('')

  useEffect(() => {
    ;(async () => {
      const id = await AsyncStorage.getItem(STORAGE_KEY)
      setEnabled(Boolean(id))
      const url = await getBaseUrl()
      setBaseUrlState(url)
    })()
  }, [])

  const onEnable = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await enableBiometrics()
      setMessage(`Biometrics enabled. Device registered.`)
      setEnabled(true)
    } catch (e) {
      setMessage(e.message || 'Enable failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>API Base URL</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput value={baseUrl} onChangeText={setBaseUrlState} autoCapitalize='none' style={styles.input} />
        <View style={{ width: 8 }} />
        <Button title="Save" onPress={async () => { await setBaseUrl(baseUrl); setMessage('Saved base URL'); }} />
        <View style={{ width: 8 }} />
        <Button title="Ping" onPress={async () => {
          try { const res = await api.ping(); setMessage(`Ping OK`)} catch (e) { setMessage(`Ping failed: ${e.message}`) }
        }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ marginRight: 12 }}>Use biometrics on this device</Text>
        <Switch value={enabled} onValueChange={() => { if (!enabled) onEnable() }} disabled={enabled || loading} />
      </View>
      {!enabled ? (
        <Button title={loading ? 'Working…' : 'Enable now'} onPress={onEnable} disabled={loading} />
      ) : null}
      {enabled ? (
        <View style={{ marginTop: 12 }}>
          <Button title="Reset biometrics on this device" onPress={async () => { await resetBiometrics(); setEnabled(false); setMessage('Biometric keys removed'); }} />
        </View>
      ) : null}
      {message ? (
        <View style={{ marginTop: 16 }}>
          <Text>{message}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
})


