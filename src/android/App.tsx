import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  NavigationContainer,
  useNavigation,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { create } from "zustand";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import {
  RootStackParamList,
  AppNavigationProp,
  useBluetoothStore,
} from "./constants";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);


  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}

      >
        <Stack.Screen name="Home">
          {() => (
            <HomeScreen />
          )}
        </Stack.Screen>

        <Stack.Screen name="BluetoothConnection">
          {() => (
            <BluetoothConnectionScreen />
          )}
        </Stack.Screen>

        <Stack.Screen name="Communication">
          {() => (
            <CommunicationScreen />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}