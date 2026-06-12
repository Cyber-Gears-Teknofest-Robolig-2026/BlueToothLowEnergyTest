
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  Platform,
  View,
  ActivityIndicator
} from 'react-native';
import * as Font from 'expo-font';
import WebApp from '@/src/web/App';
import AndroidApp from '@/src/android/App';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Font.loadAsync({
          MaterialCommunityIcons: require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
        });
      } catch (e) {
        console.warn('Font load failed', e);
      }
      if (mounted) setFontsLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  switch (Platform.OS) {
    case 'web':
      return <WebApp />;
    case 'android':
      return <AndroidApp />;
    default:
      return <View />;
  }
}
