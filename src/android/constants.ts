import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BleManager } from "react-native-ble-plx";
import { create } from "zustand";

// Single shared BLE manager for the whole app (App.tsx + screens use this one
// instance, mirroring how the Classic version shares RNBluetoothClassic).
//
// Created lazily: the shared entry (src/App.tsx) statically imports the Android
// app, so this module is also evaluated in the web bundle. `new BleManager()`
// throws in a browser (no native module), so we only instantiate it on first
// use, which on web never happens.
let managerInstance: BleManager | null = null;
export const getBleManager = (): BleManager => {
  if (!managerInstance) {
    managerInstance = new BleManager();
  }
  return managerInstance;
};

// Custom device GATT service/characteristics (must match the firmware UUIDs).
export const NUS_SERVICE = "8c17a100-2b31-4f52-9a68-7b126a090001";
export const NUS_RX = "8c17a100-2b31-4f52-9a68-7b126a090002"; // write (client -> device)
export const NUS_TX = "8c17a100-2b31-4f52-9a68-7b126a090003"; // notify (device -> client)

// BLE-backed device wrapper that exposes the same surface the Classic
// `BluetoothDevice` did (address / name / bonded / write / disconnect /
// onDataReceived) so the screens stay identical to the Classic version.
export interface BluetoothDevice {
  id: string;
  name?: string | null;
  address?: string; // BLE: equals `id` (the device identifier / MAC on Android)
  bonded?: boolean;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (cb: (event: { data: string }) => void) => { remove: () => void };
}

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

type BluetoothStore = {
  connectedDevice: BluetoothDevice | null;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
  messages: Message[];
  // Accepts a new array or a React-style updater so an async BLE notification
  // callback can append without capturing a stale `messages`.
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  messages: [],
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === "function" ? messages(state.messages) : messages,
    })),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) => set({ manuallyDisconnected }),
}));
