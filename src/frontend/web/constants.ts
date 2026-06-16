import { create } from "zustand";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ConnectedDevice, ScannedDevice } from "./BluetoothContext";

// Backend sözleşmesindeki cihaz tiplerini ekranlara yeniden açıyoruz.
export type { ConnectedDevice, ScannedDevice };

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

type BluetoothStore = {
  /** Aktif bağlantı (backend'ten gelen ConnectedDevice) — UI durumu olarak tutulur. */
  connectedDevice: ConnectedDevice | null;
  setConnectedDevice: (device: ConnectedDevice | null) => void;
  deviceName: string | null;
  setDeviceName: (name: string | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  deviceName: null,
  setDeviceName: (name) => set({ deviceName: name }),
  messages: [],
  setMessages: (messages: Message[]) => set({ messages }),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) =>
    set({ manuallyDisconnected }),
}));
