import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet } from 'react-native'
import { getBaseUrl, setBaseUrl as saveBaseUrl, api } from '../api/client'

export default function NetworkSettings() {
  const [baseUrl, setBaseUrl] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const url = await getBaseUrl()
      setBaseUrl(url)
    })()
  }, [])

  const onSave = async () => {
    await saveBaseUrl(baseUrl)
    setMessage('Saved base URL')
  }

  const onPing = async () => {
    setLoading(true)
    setMessage('')
    try {
      await api.ping()
      setMessage('Ping OK')
    } catch (e) {
      setMessage(`Ping failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Server Connection</Text>
      <Text style={styles.help}>Set your server URL. On a phone, use your Mac's IP, e.g. http://192.168.x.x:3000</Text>
      <TextInput value={baseUrl} onChangeText={setBaseUrl} autoCapitalize='none' style={styles.input} />
      <View style={{ height: 12 }} />
      <View style={{ flexDirection: 'row' }}>
        <Button title="Save" onPress={onSave} />
        <View style={{ width: 12 }} />
        <Button title={loading ? 'Pinging…' : 'Ping'} onPress={onPing} disabled={loading} />
      </View>
      {message ? (
        <View style={{ marginTop: 16 }}>
          <Text>{message}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  help: { color: '#555', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
})


