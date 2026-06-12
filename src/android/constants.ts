import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { create } from "zustand";

// Minimal BLE-compatible device interface used across Android screens
export interface BluetoothDevice {
  id: string;
  name?: string | null;
  address?: string; // keep for compatibility with existing UI
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived?: (cb: (event: { data: string }) => void) => { remove: () => void };
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
  setMessages: (messages: Message[]) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  messages: [],
  setMessages: (messages: Message[]) => set({ messages }),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) => set({ manuallyDisconnected }),
}));