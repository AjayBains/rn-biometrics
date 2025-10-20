import React, { useContext, useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet } from 'react-native'
import { AuthContext } from '../context/AuthContext'

export default function Register({ navigation }) {
  const { register } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setLoading(true)
    setMessage('')
    try {
        console.log('onSubmit', email, password)
      await register({ email, password })
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (e) {
        console.log('onSubmit error', e)
      setMessage(e.message || 'Register failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title={loading ? 'Working…' : 'Create account'} onPress={onSubmit} disabled={loading} />
      <View style={{ height: 12 }} />
      <Button title="Go to Login" onPress={() => navigation.navigate('Login')} />
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
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
})


