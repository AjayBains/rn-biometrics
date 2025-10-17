import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export default function BiometricFinal() {
  const rnBiometrics = useMemo(
    () => new ReactNativeBiometrics({ allowDeviceCredentials: true }),
    []
  );
  const navigation = useNavigation();

  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [keysExist, setKeysExist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  console.log('message', message);

  useEffect(() => {
    (async () => {
      try {
        const { available, biometryType } = await rnBiometrics.isSensorAvailable();
        setIsAvailable(Boolean(available));
        setBiometryType(biometryType ?? null);
      } catch (e) {
        setIsAvailable(false);
        setMessage((e && e.message) || 'Biometrics unavailable');
      }
      try {
        const { keysExist } = await rnBiometrics.biometricKeysExist();
        setKeysExist(keysExist);
      } catch {
        setKeysExist(false);
      }
    })();
  }, [rnBiometrics]);

  const authenticate = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate bro',
      });
      if (success) {
        setMessage('Authenticated');
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else if (error) {
        setMessage(error);
      } else {
        setMessage('Cancelled');
      }
    } catch (e) {
      setMessage((e && e.message) || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [rnBiometrics]);

  const ensureKeys = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const status = await rnBiometrics.biometricKeysExist();
      if (!status.keysExist) {
        const {privatekey, publicKey } = await rnBiometrics.createKeys();
        console.log('PublicKey:', publicKey);
        console.log('privateKey:', privatekey);
        setKeysExist(true);
        setMessage(`Keys created. PublicKey length: ${publicKey.length}`);
      } else {
        setKeysExist(true);
        console.log('publicKey2:', publicKey);
        setMessage('Keys already exist');
      }
    } catch (e) {
      setMessage((e && e.message) || 'Key operation failed');
    } finally {
      setLoading(false);
    }
  }, [rnBiometrics]);

  const deleteKeys = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const { keysDeleted } = await rnBiometrics.deleteKeys();
      setKeysExist(!keysDeleted ? keysExist : false);
      setMessage(keysDeleted ? 'Keys deleted' : 'No keys to delete');
    } catch (e) {
      setMessage((e && e.message) || 'Delete failed');
    } finally {
      setLoading(false);
    }
  }, [rnBiometrics, keysExist]);

  const signSamplePayload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      if (!keysExist) {
        setMessage('No keys. Create keys first.');
        return;
      }
      const payload = `login:${Platform.OS}:${Date.now()}`;
      const { success, signature, error } = await rnBiometrics.createSignature({
        promptMessage: 'Confirm to sign',
        payload,
      });
      if (success && signature) {
        console.log('Signature:', signature);
        setMessage(`Signed payload. Signature length: ${signature.length}`);
      } else if (error) {
        setMessage(error);
      } else {
        setMessage('Signing cancelled');
      }
    } catch (e) {
      setMessage((e && e.message) || 'Signing failed');
    } finally {
      setLoading(false);
    }
  }, [rnBiometrics]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.block}>
        <Text style={styles.title}>Biometric Authentication</Text>
        <Text>Supported: {isAvailable ? 'Yes' : 'No'}</Text>
        <Text>Type: {biometryType ?? 'Unavailable'}</Text>
        {Platform.OS === 'android' ? (
          <Text style={styles.note}>Ensure device lock + enrolled biometrics.</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button title={loading ? 'Working…' : 'Authenticate'} onPress={authenticate} disabled={!isAvailable || loading} />
        <View style={styles.spacer} />
        <Button title="Create/Check Keys" onPress={ensureKeys} disabled={!isAvailable || loading} />
        <View style={styles.spacer} />
        <Button title="Sign Sample Payload" onPress={signSamplePayload} disabled={!isAvailable || !keysExist || loading} />
        <View style={styles.spacer} />
        <Button title="Delete Keys" onPress={deleteKeys} disabled={loading} />
      </View>

      {message ? (
        <View style={styles.block}>
          <Text>{message}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  block: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    marginVertical: 8,
  },
  spacer: {
    height: 8,
  },
  note: {
    color: '#666',
    marginTop: 4,
  },
});


