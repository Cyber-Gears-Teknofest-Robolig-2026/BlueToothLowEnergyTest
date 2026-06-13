import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import HomeScreen from './HomeScreen';
import BluetoothConnectionScreen from './BluetoothConnectionScreen';
import CommunicationScreen from './CommunicationScreen';
import {
  type RootStackParamList,
  useBluetoothStore,
  useSettingsStore,
} from './constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

function ensureTurkishNoTranslate() {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  html.lang = "tr";
  html.setAttribute("translate", "no");
  html.classList.add("notranslate");

  if (document.body) {
    document.body.setAttribute("translate", "no");
    document.body.classList.add("notranslate");
  }

  let meta = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "google";
    (document.head || document.documentElement).appendChild(meta);
  }
  meta.content = "notranslate";
}

// Run as early as possible (before first paint) to keep the browser from
// offering to translate the page. Safe on native: it no-ops without `document`.
ensureTurkishNoTranslate();

const AppNavigator = () => {
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const manuallyDisconnected = useBluetoothStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  useEffect(() => {
    // Bağlantı kopma kontrolü (Web Bluetooth API için basit implementasyon)
    const checkConnection = setInterval(() => {
      if (connectedDevice && !manuallyDisconnected) {
        // Web Bluetooth API'de bağlantı durumu kontrolü
        // Gerçek implementasyon daha karmaşık olabilir
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, [connectedDevice, manuallyDisconnected]);

  const settingsHydrated = useSettingsStore((state) => state._hasHydrated);

  useEffect(() => {
    ensureTurkishNoTranslate();
  }, []);

  if (!settingsHydrated) {
    return null;
  }

  return (
    <NavigationContainer
      documentTitle={{
        formatter: (_, route) => {
          const titles: Record<string, string> = {
            Home: 'Ana Sayfa',
            BluetoothConnection: 'Bluetooth Yönetimi',
            Communication: 'İletişim',
          };
          return titles[route?.name ?? ''] ?? 'Bluetooth Test';
        },
      }}
      linking={{
        prefixes: [],
        config: {
          screens: {
            Home: '',
            BluetoothConnection: 'BluetoothConnection',
            Communication: 'Communication',
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home">
          {() => <HomeScreen />}
        </Stack.Screen>

        <Stack.Screen name="BluetoothConnection">
          {() => <BluetoothConnectionScreen />}
        </Stack.Screen>

        <Stack.Screen name="Communication">
          {() => <CommunicationScreen />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
