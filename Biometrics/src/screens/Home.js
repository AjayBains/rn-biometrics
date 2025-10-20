import React, { useContext } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const navigation = useNavigation()
  const { email, logout } = useContext(AuthContext)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text>You are authenticated{email ? ` as ${email}` : ''}.</Text>
      <View style={{ height: 12 }} />
      <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
      <View style={{ height: 12 }} />
      <Button title="Logout" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
});
