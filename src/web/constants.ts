import { create } from 'zustand';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export const NUS_SERVICE = '8c17a100-2b31-4f52-9a68-7b126a090001'; // lowercase required by Web Bluetooth
export const NUS_RX = '8c17a100-2b31-4f52-9a68-7b126a090002'; // write
export const NUS_TX = '8c17a100-2b31-4f52-9a68-7b126a090003'; // notify

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BluetoothDevice {
  id?: string;
  name?: string | null;
  write: (data: string) => Promise<void>;
  onDataReceived: (cb: (event: { data: string }) => void) => { remove: () => void };
  disconnect: () => Promise<void>;
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

// Persisted app settings (survive a page reload). `_hasHydrated` lets the UI
// wait until the stored values are read back from AsyncStorage before rendering.
type SettingsStore = {
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist the transient hydration flag itself.
      partialize: () => ({}),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
