import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import { type RootStackParamList, useBluetoothStore } from "./constants";
import { useBluetooth } from "./BluetoothContext";
import { useThemeColors, useEffectiveTheme } from "./theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const bt = useBluetooth();
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  // Cihazla bağlantı koptuğunda (güç kesilmesi / menzil dışı) kullanıcıyı uyar.
  // Manuel kesmede (BluetoothConnection/Communication ekranları) manuallyDisconnected
  // true'ya çekildiği için burada uyarı gösterilmez.
  useEffect(() => {
    const sub = bt.onDeviceDisconnected(() => {
      setConnectedDevice(null);
      setDeviceName(null);
      const { manuallyDisconnected } = useBluetoothStore.getState();
      if (!manuallyDisconnected && typeof window !== "undefined") {
        window.alert(
          "Bağlantı Koptu ⚠️\nCihazın gücü kesildi veya menzilden çıkıldı."
        );
      }
      setManuallyDisconnected(false);
    });
    return () => sub.remove();
  }, [bt]);

  const colors = useThemeColors();
  const effective = useEffectiveTheme();
  const base = effective === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
      notification: colors.danger,
    },
  };
  return (
    <NavigationContainer
      theme={navTheme}
      documentTitle={{
        formatter: (_, route) => {
          const titles: Record<string, string> = {
            Home: "Ana Sayfa",
            BluetoothConnection: "Bluetooth Yönetimi",
            Communication: "İletişim",
          };
          return titles[route?.name ?? ""] ?? "Bluetooth Test";
        },
      }}
      linking={{
        prefixes: [],
        config: {
          screens: {
            Home: "",
            BluetoothConnection: "BluetoothConnection",
            Communication: "Communication",
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home">{() => <HomeScreen />}</Stack.Screen>
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

// Backend, frontend DIŞINDA (src/App.tsx) <BluetoothProvider> ile enjekte edilir.
export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
