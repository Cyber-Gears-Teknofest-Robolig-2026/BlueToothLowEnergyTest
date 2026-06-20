/**
 * ANDROID BACKEND — Bluetooth Low Energy (BLE)
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin BLE (GATT) ile uygulanması. `react-native-ble-plx`
 * kütüphanesini kullanır. Frontend'e şeffaf olarak UTF-8 metin iletimi
 * sağlar: TX karakteristiğinden (NOTIFY) gelen base64 veriyi decode edip
 * frontend'e gönderir; yazma için RX karakteristiğine base64 ile gönderir.
 */
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

// Kullanıcıdan sağlanan UUID'ler (PlatformIO'dan):
const SERVICE_UUID = "8C17A100-2B31-4F52-9A68-7B126A090001".toLowerCase();
const RX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090002".toLowerCase();
const TX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090003".toLowerCase();

const SCAN_TIMEOUT_MS = 12000;
const manager = new BleManager();
let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let scanActive = false;

// "Cihaz bağlantısı koptu" için global dinleyiciler. Sözleşmedeki
// onDeviceDisconnected uygulama açılışında BİR kez (bağlantıdan ÖNCE) kaydedilir;
// BLE'de kopma ise cihaza özeldir. Bu yüzden her bağlantıda cihazın kopma
// olayını (manager.onDeviceDisconnected) bu global dinleyicilere köprüleriz.
const deviceDisconnectListeners = new Set<() => void>();
let activeDisconnectSub: { remove: () => void } | null = null;
const emitDeviceDisconnected = () => {
  deviceDisconnectListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* bir dinleyicinin hatası diğerlerini engellemesin */
    }
  });
};

const waitForPoweredOn = (timeout = 5000) =>
  new Promise<boolean>((resolve) => {
    const sub = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        sub.remove();
        resolve(true);
      }
    }, true);
    setTimeout(() => {
      try { sub.remove(); } catch { }
      resolve(false);
    }, timeout);
  });

const base64FromUtf8 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
const utf8FromBase64 = (b?: string) => (b ? Buffer.from(b, "base64").toString("utf-8") : "");

export const androidBackend: BluetoothApi = {
  supportsDeviceList: true,

  async requestPermissions() {
    if (Platform.OS !== "android") return true;
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
    // Bazı Android sürümlerinde location gerekebilir; güvenli tarafta ekle.
    permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    const result = await PermissionsAndroid.requestMultiple(permissions);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted" &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === "granted"
    );
  },

  async isEnabled() {
    // BleManager state kontrolüyle Bluetooth'un açık olup olmadığını denetle.
    try {
      const ok = await waitForPoweredOn(1000);
      return ok;
    } catch {
      return false;
    }
  },

  async ensureEnabled() {
    // Mobil platformlarda kullanıcıya açtırma diyalogu yok; yalnızca state kontrolü.
    return await waitForPoweredOn(3000);
  },

  async startScan({ onDevice, onError, onComplete }: ScanHandlers) {
    scanActive = true;
    const seen = new Set<string>();

    const emit = (d: any) => {
      if (!d?.id || seen.has(d.id)) return;
      seen.add(d.id);
      const device: ScannedDevice = {
        id: d.id,
        address: d.id,
        name: d.name ?? "Bilinmeyen Cihaz",
      };
      onDevice(device);
    };

    const finish = () => {
      if (!scanActive) return;
      scanActive = false;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }
      manager.stopDeviceScan();
      onComplete?.();
    };

    try {
      // Kısa süreli tarama; sadece belirtilen servis UUID'sini filtrele
      scanTimeout = setTimeout(finish, SCAN_TIMEOUT_MS);
      manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          onError?.(error);
          finish();
          return;
        }
        if (device) emit(device);
      });
    } catch (error) {
      onError?.(error);
      finish();
    }
  },

  stopScan() {
    scanActive = false;
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    try {
      manager.stopDeviceScan();
    } catch { }
  },

  async connect(device?: ScannedDevice) {
    if (!device?.id) throw new Error("Bağlanmak için bir cihaz id'si gerekli.");

    const dev = await manager.connectToDevice(device.id, { timeout: 10000 });
    await dev.discoverAllServicesAndCharacteristics();

    // Bağlantı koptuğunda (güç kesilmesi / menzil dışı / BT kapanması) global
    // "bağlantı koptu" dinleyicilerini tetikle. Önceki cihazın aboneliğini
    // temizleyip bu cihaz için yenisini kur.
    activeDisconnectSub?.remove();
    const disconnectSub = manager.onDeviceDisconnected(dev.id, () => {
      emitDeviceDisconnected();
    });
    activeDisconnectSub = { remove: () => disconnectSub.remove() };

    // Monitor TX characteristic (notify)
    const subscription = manager.monitorCharacteristicForDevice(
      dev.id,
      SERVICE_UUID,
      TX_UUID,
      (error, characteristic) => {
        // handled below by ConnectedDevice wrapper via onDataReceived subscriptions
      }
    );
    // subscription.remove() çağrısı gerektiğinde yapılacak (disconnect wrapper)

    const write = async (data: string) => {
      const base64 = base64FromUtf8(data);
      // writeCharacteristicWithResponseForDevice kullanımı; hata durumunda fırlatır
      await manager.writeCharacteristicWithResponseForDevice(
        dev.id,
        SERVICE_UUID,
        RX_UUID,
        base64
      );
    };

    const disconnect = async () => {
      try {
        subscription.remove();
      } catch { }
      try {
        await manager.cancelDeviceConnection(dev.id);
      } catch { }
    };

    const onDataReceived = (listener: (event: { data: string }) => void) => {
      // Her çağrıda yeni bir monitor oluşturmak yerine merkezi monitor kullanmak
      // daha verimlidir; fakat basitlik için burada doğrudan manager.monitor... kullanıyoruz.
      const sub = manager.monitorCharacteristicForDevice(
        dev.id,
        SERVICE_UUID,
        TX_UUID,
        (error, characteristic) => {
          if (error) return;
          const text = utf8FromBase64(characteristic?.value ?? undefined);
          if (text) listener({ data: text });
        }
      );
      return { remove: () => sub.remove() };
    };

    const connectedDevice: ConnectedDevice = {
      id: dev.id,
      address: dev.id,
      name: dev.name ?? "BLE Cihazı",
      write,
      disconnect,
      onDataReceived,
    };

    return connectedDevice;
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    // BleManager kendi state subscription'ını sağlar; burada basit NOOP döndürülür.
    return { remove: () => { } };
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    // Global dinleyiciye ekle; gerçek kopma, cihaz bağlandığında kurulan
    // manager.onDeviceDisconnected aboneliği (bkz. connect) ile tetiklenir.
    deviceDisconnectListeners.add(listener);
    return {
      remove: () => {
        deviceDisconnectListeners.delete(listener);
      },
    };
  },
};

export default androidBackend;
