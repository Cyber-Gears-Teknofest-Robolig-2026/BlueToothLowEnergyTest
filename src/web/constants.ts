import { create } from 'zustand';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BluetoothDevice {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  close: () => Promise<void>;
}

interface Message {
  id: number;
  text: string;
  mode: 'sent' | 'received';
  time: string;
}

type BluetoothStore = {
  connectedDevice: BluetoothDevice | null;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
  deviceName: string | null;
  setDeviceName: (name: string | null) => void;
  messages: Message[];
  // Accepts a new array or a React-style updater so the async read loop can
  // append without capturing a stale `messages`.
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
  deviceName: null,
  setDeviceName: (name) => set({ deviceName: name }),
  messages: [],
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) => set({ manuallyDisconnected }),
}));
