import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';


export default function Biometrics() {
  const [biometryType, setBiometryType] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    (async () => {
      try {
        const rnBiometrics = new ReactNativeBiometrics();
        console.log('Checking biometry type');
        // const { biometryType } = await rnBiometrics.isSensorAvailable();
        // console.log('Biometry type:', biometryType);
        rnBiometrics?.isSensorAvailable().then(resultObject => {
          const { available, biometryType } = resultObject;
          console.log('Biometry type:', biometryType);

          setBiometryType(biometryType ?? null);
          if (available && biometryType === BiometryTypes.TouchID) {
            console.log('TouchID is supported');
          } else if (available && biometryType === BiometryTypes.FaceID) {
            console.log('FaceID is supported');
          } else if (available && biometryType === BiometryTypes.Biometrics) {
            console.log('Biometrics is supported');
          } else {
            console.log('Biometrics not supported');
          }
        });
      } catch (e) {
        console.log('Error:', e);
        setError(e.message);
      }
    })();
  }, []);

  return (
    <SafeAreaView>

    <View>
        <Text>Biometrics</Text>
      <Text>Biometry: {biometryType ?? 'Unavailable'}</Text> 
   {error ? <Text>Error: {error}</Text> : null}
    </View>
    </SafeAreaView>
  );
}