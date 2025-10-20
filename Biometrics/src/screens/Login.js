import React, { useContext, useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet } from 'react-native'
import { AuthContext } from '../context/AuthContext'

export default function Login({ navigation }) {
  const { login, biometricLogin} = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setLoading(true)
    setMessage('')
    try {
      await login({ email, password })
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (e) {
      setMessage(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onBiometric = async () => {
    setLoading(true)
    setMessage('')
    try {
 
      await biometricLogin()
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    } catch (e) {
        console.log(e);
      setMessage(e.message || 'Biometric login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
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
      <Button title={loading ? 'Working…' : 'Login'} onPress={onSubmit} disabled={loading} />
      <View style={{ height: 12 }} />
      <Button title="Login with Biometrics" onPress={onBiometric} disabled={loading} />
      <View style={{ height: 12 }} />
      <Button title="Go to Register" onPress={() => navigation.navigate('Register')} />
      <View style={{ height: 12 }} />
      <Button title="Network Settings" onPress={() => navigation.navigate('NetworkSettings')} />
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


