/**
 * WEB BACKEND — Web Bluetooth (GATT)
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin Web Bluetooth API ile uygulanması. Burada
 * connect() tarayıcı cihaz seçici penceresini açar; servis/karakteristikleri
 * provided UUID'lerle (SERVICE, RX=write, TX=notify) kullanır.
 */
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

const SERVICE_UUID = "8C17A100-2B31-4F52-9A68-7B126A090001".toLowerCase();
const RX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090002".toLowerCase();
const TX_UUID = "8C17A100-2B31-4F52-9A68-7B126A090003".toLowerCase();

const NOOP_SUBSCRIPTION: Subscription = { remove: () => {} };

const hasWebBluetooth = () =>
  typeof navigator !== "undefined" && !!(navigator as any).bluetooth;

// "Cihaz bağlantısı koptu" için global dinleyiciler. Web Bluetooth kopmayı
// device üzerindeki `gattserverdisconnected` olayıyla bildirir; her bağlantıda
// o olayı bu dinleyicilere köprüleriz (sözleşmedeki onDeviceDisconnected
// bağlantıdan ÖNCE bir kez kaydedilir).
const deviceDisconnectListeners = new Set<() => void>();
// Aktif bağlantının `gattserverdisconnected` dinleyicisini temizlemek için
// tutulur. Web Bluetooth aynı fiziksel cihaz için AYNI device nesnesini
// döndürebildiğinden, her connect'te yeni bir listener eklemek olayın birden
// çok kez tetiklenmesine (mükerrer "bağlantı koptu" uyarısı) yol açar.
let activeDisconnectCleanup: (() => void) | null = null;
const emitDeviceDisconnected = () => {
  deviceDisconnectListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* bir dinleyicinin hatası diğerlerini engellemesin */
    }
  });
};

export const webBackend: BluetoothApi = {
  supportsDeviceList: false,

  async requestPermissions() {
    // Web Bluetooth izinleri connect() sırasında kullanıcı tarafından verilir.
    return hasWebBluetooth();
  },

  async isEnabled() {
    return hasWebBluetooth();
  },

  async ensureEnabled() {
    return hasWebBluetooth();
  },

  async startScan({ onComplete }: ScanHandlers) {
    // Web Bluetooth tarama için kullanıcı etkileşimi gerektirir; burada hemen tamamla.
    onComplete?.();
  },

  stopScan() {},

  async connect(_device?: ScannedDevice) {
    if (!hasWebBluetooth()) {
      throw new Error("Tarayıcınız Web Bluetooth API desteklemiyor. Chrome/Edge deneyin.");
    }
    // Cihaz seçici: servis filtresi kullan (kullanıcı cihazı seçer)
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const rxChar = await service.getCharacteristic(RX_UUID);
    const txChar = await service.getCharacteristic(TX_UUID);

    // Web Bluetooth aynı anda YALNIZCA tek bir GATT işlemine izin verir; aksi
    // halde "GATT operation already in progress" hatası alınır. Bu yüzden tüm
    // GATT işlemlerini (write / startNotifications / stopNotifications) tek bir
    // promise zinciri üzerinden seri olarak çalıştırıyoruz. Bir işlem reddedilse
    // bile zincir kırılmaz; sıradaki işlem yine de çalışır.
    let gattChain: Promise<unknown> = Promise.resolve();
    const enqueueGatt = <T>(op: () => Promise<T>): Promise<T> => {
      const run = gattChain.then(op, op);
      gattChain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    };

    // Yazma helper (text -> bytes) — GATT kuyruğu üzerinden seri çalışır.
    const write = async (data: string) => {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      await enqueueGatt(() => rxChar.writeValue(bytes));
    };

    const disconnect = async () => {
      try {
        await server.disconnect();
      } catch {}
    };

    const onDataReceived = (listener: (event: { data: string }) => void) => {
      const decoder = new TextDecoder();
      const handler = (ev: any) => {
        try {
          const value = ev.target.value; // DataView
          const arr = new Uint8Array(value.buffer);
          const text = decoder.decode(arr).trim();
          if (text) listener({ data: text });
        } catch {
          /* ignore */
        }
      };
      txChar.addEventListener("characteristicvaluechanged", handler);
      enqueueGatt(() => txChar.startNotifications()).catch(() => {});
      return {
        remove: () => {
          try {
            txChar.removeEventListener("characteristicvaluechanged", handler);
            enqueueGatt(() => txChar.stopNotifications()).catch(() => {});
          } catch {}
        },
      };
    };

    const connectedDevice: ConnectedDevice = {
      id: device.id,
      address: device.id,
      name: device.name ?? "BLE Cihazı",
      write,
      disconnect,
      onDataReceived,
    };

    // Önceki bağlantının kopma dinleyicisini kaldır; her zaman tek bir aktif
    // dinleyici kalsın. (Mükerrer "bağlantı koptu" uyarılarının asıl sebebi,
    // aynı device nesnesinde biriken çok sayıda dinleyiciydi.)
    activeDisconnectCleanup?.();
    const handleGattDisconnect = () => emitDeviceDisconnected();
    device.addEventListener?.("gattserverdisconnected", handleGattDisconnect);
    activeDisconnectCleanup = () => {
      device.removeEventListener?.("gattserverdisconnected", handleGattDisconnect);
      activeDisconnectCleanup = null;
    };

    return connectedDevice;
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    return NOOP_SUBSCRIPTION;
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    deviceDisconnectListeners.add(listener);
    return {
      remove: () => {
        deviceDisconnectListeners.delete(listener);
      },
    };
  },
};

export default webBackend;
