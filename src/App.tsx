import React from "react";
import { LogBox, Platform } from "react-native";
import WebApp from "@/src/frontend/web/App";
import AndroidApp from "@/src/frontend/android/App";
import { BluetoothProvider as WebBluetoothProvider } from "@/src/frontend/web/BluetoothContext";
import { BluetoothProvider as AndroidBluetoothProvider } from "@/src/frontend/android/BluetoothContext";
import type { BluetoothApi } from "@/src/backend";

// @react-navigation/elements v2.x hâlâ `pointerEvents` prop'unu kullanıyor;
// upstream güncellenene kadar warning'i bastır.
LogBox.ignoreLogs([/props\.pointerEvents is deprecated/]);

// RN Web'te LogBox console'u her zaman filtrelemiyor; web'de doğrudan console.warn
// üzerinde de aynı pattern'i filtrele.
if (Platform.OS === "web" && typeof console !== "undefined") {
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("props.pointerEvents is deprecated")) {
      return;
    }
    originalWarn(...args);
  };
}

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
