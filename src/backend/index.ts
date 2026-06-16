/**
 * BACKEND GİRİŞ NOKTASI (BAĞIMSIZ SÖZLEŞME)
 * --------------------------------------------------------------------------
 * Backend'in kendi tip sözleşmesi burada tanımlıdır; frontend'den hiçbir şey
 * import edilmez. Frontend de kendi tiplerini ayrı tanımlar; runtime'da
 * yapısal uyumluluk (structural typing) ile birbirine geçerler.
 *
 * Somut backend'ler platform çözümlemesini bozmamak için doğrudan import edilir:
 *   - android:  src/backend/android  → androidBackend
 *   - web:      src/backend/web      → webBackend
 */

/** Abonelik tutamacı; dinleyici eklendiğinde döner, `remove()` ile temizlenir. */
export type Subscription = { remove: () => void };

/** Cihaz hangi alt teknolojiyle bulundu? */
export type DeviceKind = "classic" | "serial";

/** Tarama sırasında listelenen, henüz bağlanılmamış cihaz. */
export type ScannedDevice = {
  id: string;
  address: string;
  name: string;
  bonded?: boolean;
  kind?: DeviceKind;
};

/**
 * Aktif bağlantı. Frontend bu nesne üzerinden mesaj yazar/dinler.
 * `onDataReceived` her platformda ÇÖZÜLMÜŞ (decoded) UTF-8 metin yollar.
 */
export type ConnectedDevice = {
  id: string;
  address: string;
  name: string;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => Subscription;
};

/** Tarama sırasında geri çağrılar. */
export type ScanHandlers = {
  onDevice: (device: ScannedDevice) => void;
  onError?: (error: unknown) => void;
  onComplete?: () => void;
};

/** Backend motorunun dış dünyaya sunduğu arayüz. */
export interface BluetoothApi {
  readonly supportsDeviceList: boolean;
  requestPermissions(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  ensureEnabled(): Promise<boolean>;
  startScan(handlers: ScanHandlers): Promise<void>;
  stopScan(): void;
  connect(device?: ScannedDevice): Promise<ConnectedDevice>;
  onBluetoothDisabled(listener: () => void): Subscription;
  onDeviceDisconnected(listener: () => void): Subscription;
}
