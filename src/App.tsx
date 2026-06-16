import React from "react";
import { Platform } from "react-native";
import WebApp from "@/src/frontend/web/App";
import AndroidApp from "@/src/frontend/android/App";
import { BluetoothProvider as WebBluetoothProvider } from "@/src/frontend/web/BluetoothContext";
import { BluetoothProvider as AndroidBluetoothProvider } from "@/src/frontend/android/BluetoothContext";
import type { BluetoothApi } from "@/src/backend";

/**
 * ENTEGRASYON KATMANI (frontend'in DIŞI)
 * --------------------------------------------------------------------------
 * Backend burada, frontend'in dışında, defansif şekilde yüklenir ve enjekte
 * edilir. Backend yüklenemezse (native modül yok / Expo Go / dosya silinmiş)
 * `null` döner; BluetoothProvider güvenli no-op'a düşer ve ARAYÜZ YİNE AÇILIR.
 */
function loadBackend(): BluetoothApi | null {
  try {
    switch (Platform.OS) {
      case "web":
        return require("./backend/web").default as BluetoothApi;
      case "android":
        return require("./backend/android").default as BluetoothApi;
      // add `case "ios":` here when an iOS backend is available
      default:
        return null;
    }
  } catch {
    return null;
  }
}

const backend = loadBackend();

export default function App() {
  let PlatformApp: React.ComponentType<any>;
  let PlatformBluetoothProvider: React.ComponentType<any>;

  switch (Platform.OS) {
    case "web":
      PlatformApp = WebApp;
      PlatformBluetoothProvider = WebBluetoothProvider;
      break;
    case "android":
      PlatformApp = AndroidApp;
      PlatformBluetoothProvider = AndroidBluetoothProvider;
      break;
    // add `case "ios":` here when iOS frontend/provider exist
    default:
      // fallback to Android for now; change as platforms are added
      PlatformApp = AndroidApp;
      PlatformBluetoothProvider = AndroidBluetoothProvider;
  }

  return (
    <PlatformBluetoothProvider backend={backend as any}>
      <PlatformApp />
    </PlatformBluetoothProvider>
  );
}
