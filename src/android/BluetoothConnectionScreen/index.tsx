import {
  Animated,
  PanResponder,
  View,
  useWindowDimensions,
  PermissionsAndroid,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  ScrollView,
  Modal,
  StatusBar,
  ToastAndroid,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { State } from "react-native-ble-plx";
import { Buffer } from "buffer";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import styles from './styles';
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
  BluetoothDevice,
  getBleManager,
  NUS_SERVICE,
  NUS_RX,
  NUS_TX,
} from "../constants";

// Lightweight item shown in the scan list (not the connected wrapper).
interface ScannedDevice {
  id: string;
  name?: string | null;
  address: string;
  bonded?: boolean;
}

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);

  const navigation = useNavigation<AppNavigationProp>();

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
  const insets = useSafeAreaInsets();

  const SNAP_FULL = 0;
  const SNAP_PARTIAL = SCREEN_HEIGHT * 0.35;
  const SNAP_CLOSED = SCREEN_HEIGHT;

  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectedDevice, setLastConnectedDevice] = useState<ScannedDevice | null>(null);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);

  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectSubRef = useRef<{ remove: () => void } | null>(null);
  // Names we seeded from storage, so we can detect a firmware rename on rescan.
  const seededNamesRef = useRef<Map<string, string | null | undefined>>(new Map());

  // Resolved here (Android-only render path) so the shared manager is never
  // instantiated in the web bundle. See getBleManager() in constants.
  const manager = getBleManager();

  useEffect(() => {
    loadLastConnectedDevice();
    return () => {
      try { manager.stopDeviceScan(); } catch (e) {}
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      disconnectSubRef.current?.remove();
      disconnectSubRef.current = null;
    };
  }, []);

  const loadLastConnectedDevice = async () => {
    try {
      const lastDeviceJson = await AsyncStorage.getItem('lastConnectedDevice');
      if (lastDeviceJson) {
        const lastDevice = JSON.parse(lastDeviceJson);
        setLastConnectedDevice(lastDevice);
      }
    } catch (error) {
    }
  };

  const saveLastConnectedDevice = async (device: ScannedDevice) => {
    try {
      await AsyncStorage.setItem('lastConnectedDevice', JSON.stringify(device));
      setLastConnectedDevice(device);
    } catch (error) {
    }
  };

  // BLE has no OS bonded-devices API, so we keep our own registry of devices
  // this app has connected to before. These play the role of Classic's
  // getBondedDevices(): shown first and flagged `bonded`.
  const loadKnownDevices = async (): Promise<ScannedDevice[]> => {
    try {
      const json = await AsyncStorage.getItem('knownDevices');
      return json ? JSON.parse(json) : [];
    } catch (error) {
      return [];
    }
  };

  const rememberDevice = async (device: ScannedDevice) => {
    try {
      const existing = await loadKnownDevices();
      const entry = { id: device.id, name: device.name ?? null, address: device.address ?? device.id };
      const next = [entry, ...existing.filter((d) => d.id !== entry.id)].slice(0, 10);
      await AsyncStorage.setItem('knownDevices', JSON.stringify(next));
    } catch (error) {
    }
  };

  // A renamed device keeps the same id/address, so the stored name goes stale.
  // Refresh it in the registry and the "last connected" card.
  const persistDeviceName = async (id: string, name: string) => {
    try {
      const known = await loadKnownDevices();
      let changed = false;
      const next = known.map((d) => {
        if (d.id === id && d.name !== name) { changed = true; return { ...d, name }; }
        return d;
      });
      if (changed) await AsyncStorage.setItem('knownDevices', JSON.stringify(next));
    } catch (error) {
    }
    setLastConnectedDevice((prev) => {
      if (prev && prev.id === id && prev.name !== name) {
        const updated = { ...prev, name };
        AsyncStorage.setItem('lastConnectedDevice', JSON.stringify(updated)).catch(() => {});
        return updated;
      }
      return prev;
    });
  };

  // Ask the user before turning Bluetooth on. Resolves true if they accept.
  const confirmEnableBluetooth = (): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        "Bluetooth Kapalı",
        "Cihaz aramak ve bağlanmak için Bluetooth'un açık olması gerekiyor. Şimdi açılsın mı?",
        [
          { text: "Hayır", style: "cancel", onPress: () => resolve(false) },
          { text: "Evet", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

  const requestBlePermissions = async (): Promise<boolean> => {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(result).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  };

  // Resolves true once the adapter reaches PoweredOn, or false after a timeout.
  const waitForPoweredOn = (timeoutMs: number): Promise<boolean> =>
    new Promise((resolve) => {
      let settled = false;
      const finish = (val: boolean) => {
        if (settled) return;
        settled = true;
        try { sub.remove(); } catch (e) {}
        clearTimeout(timer);
        resolve(val);
      };
      const sub = manager.onStateChange((s) => {
        if (s === State.PoweredOn) finish(true);
      }, true);
      const timer = setTimeout(() => finish(false), timeoutMs);
    });

  // Make sure Bluetooth is on, asking the user first if it is off. Tries the
  // direct enable (works on Android <= 12) and falls back to the system
  // "turn on Bluetooth?" dialog on Android 13+ where enable() is a no-op.
  const ensureBluetoothOn = async (): Promise<boolean> => {
    const state = await manager.state().catch(() => null);
    if (state === State.PoweredOn) return true;

    const shouldEnable = await confirmEnableBluetooth();
    if (!shouldEnable) return false; // user declined → abort quietly

    const apiLevel = typeof Platform.Version === "number" ? Platform.Version : 0;

    if (apiLevel < 31) {
      // Android <= 11: BluetoothAdapter.enable() works and is silent.
      manager.enable().catch(() => {});
      if (await waitForPoweredOn(5000)) return true;
    } else {
      // Android 12+: enable() is restricted/deprecated, so ask the OS to turn
      // Bluetooth on via the system dialog (works on all modern versions).
      try {
        await Linking.sendIntent("android.bluetooth.adapter.action.REQUEST_ENABLE");
        if (await waitForPoweredOn(20000)) return true;
      } catch (e) {}
    }

    Alert.alert("Hata", "Bluetooth açılamadı. Lütfen elle açıp tekrar deneyin.");
    return false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const nextValue = currentSnapPoint.current + gestureState.dy;
        if (nextValue >= -20) panY.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const movedY = currentSnapPoint.current + gestureState.dy;
        const velocity = gestureState.vy;

        if (velocity > 0.5 || movedY > SCREEN_HEIGHT * 0.3) closeModal();
        else animateToPoint(SNAP_FULL);
      }
    })
  ).current;

  const animateToPoint = (point: number) => {
    Animated.spring(panY, {
      toValue: point,
      useNativeDriver: true,
      tension: 50,
      friction: 10
    }).start(() => currentSnapPoint.current = point);
  };

  const closeModal = () => {
    Animated.timing(panY, {
      toValue: SNAP_CLOSED,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
      currentSnapPoint.current = SNAP_CLOSED;
    });
    try { manager.stopDeviceScan(); } catch (e) {}
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
  };

  const openBluetoothModal = async () => {

    // Permissions first so enabling Bluetooth (needs BLUETOOTH_CONNECT) works.
    if (!(await requestBlePermissions())) {
      Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan and connect to devices.');
      return;
    }

    if (!(await ensureBluetoothOn())) {
      return;
    }

    setModalVisible(true);
    animateToPoint(SNAP_FULL);

    setScanning(true);

    try { manager.stopDeviceScan(); } catch (e) {}

    // Seed the list with "bonded" (previously connected + currently connected)
    // devices first, exactly like Classic shows getBondedDevices() up front.
    seededNamesRef.current.clear();
    const bondedMap = new Map<string, ScannedDevice>();
    const known = await loadKnownDevices();
    known.forEach((d) => {
      bondedMap.set(d.id, { id: d.id, name: d.name, address: d.address ?? d.id, bonded: true });
      seededNamesRef.current.set(d.id, d.name);
    });
    try {
      const systemConnected = await manager.connectedDevices([NUS_SERVICE]);
      systemConnected.forEach((d) => {
        bondedMap.set(d.id, { id: d.id, name: d.name, address: d.id, bonded: true });
        seededNamesRef.current.set(d.id, d.name);
      });
    } catch (e) {}
    setDevices(Array.from(bondedMap.values()));

    // Discover nearby (advertising) devices and merge them in, keeping the
    // bonded flag for any that we already know.
    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        setScanning(false);
        return;
      }
      if (!device) return;

      const advName = device.name;

      // A known device may have been renamed in firmware (same id/address, new
      // advertised name). Persist the new name so the stale one stops showing.
      if (advName && seededNamesRef.current.has(device.id) && seededNamesRef.current.get(device.id) !== advName) {
        seededNamesRef.current.set(device.id, advName);
        persistDeviceName(device.id, advName);
      }

      setDevices((prev) => {
        const idx = prev.findIndex((p) => p.id === device.id);
        if (idx !== -1) {
          // Prefer the freshly advertised name (handles renamed devices).
          if (advName && advName !== prev[idx].name) {
            const next = [...prev];
            next[idx] = { ...next[idx], name: advName };
            return next;
          }
          return prev;
        }
        return [...prev, { id: device.id, name: advName, address: device.id, bonded: false }];
      });
    });

    // Classic's startDiscovery() resolves once; BLE scanning streams, so we
    // stop it after a fixed window and clear the scanning indicator.
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      try { manager.stopDeviceScan(); } catch (e) {}
      setScanning(false);
    }, 8000);
  };

  const connectToDevice = async (device: ScannedDevice) => {
    // Permissions first so enabling Bluetooth (needs BLUETOOTH_CONNECT) works.
    if (!(await requestBlePermissions())) {
      Alert.alert('Permissions Required', 'Bluetooth permissions are required to connect to devices.');
      return;
    }
    if (!(await ensureBluetoothOn())) {
      return;
    }
    try {
      closeModal();
      setIsConnecting(true);

      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();

      // Notify and clean up if the device drops on its own. Mirrors the Classic
      // App.tsx onDeviceDisconnected handler, wired per-device for BLE. Drop any
      // previous subscription so reconnects don't stack duplicate alerts.
      disconnectSubRef.current?.remove();
      disconnectSubRef.current = manager.onDeviceDisconnected(connected.id, () => {
        setConnectedDevice(null);
        const { manuallyDisconnected } = useBluetoothStore.getState();
        if (!manuallyDisconnected) {
          Alert.alert("Bağlantı Koptu ⚠️", "Cihazın gücü kesildi veya menzilden çıkıldı.");
        }
        setManuallyDisconnected(false);
      });

      // Wrap the BLE device so the rest of the app talks to it just like a
      // Classic BluetoothDevice (write / disconnect / onDataReceived).
      const connectedWrapper: BluetoothDevice = {
        id: connected.id,
        // Prefer the name we just scanned/displayed (reflects firmware renames).
        name: device.name || connected.name,
        address: connected.id,
        bonded: true,
        write: async (data: string) => {
          const base64 = Buffer.from(data, "utf8").toString("base64");
          try {
            await manager.writeCharacteristicWithResponseForDevice(connected.id, NUS_SERVICE, NUS_RX, base64);
          } catch (e) {
            await manager.writeCharacteristicWithoutResponseForDevice(connected.id, NUS_SERVICE, NUS_RX, base64);
          }
        },
        disconnect: async () => {
          try {
            await manager.cancelDeviceConnection(connected.id);
          } catch (e) {
          }
        },
        onDataReceived: (cb) => {
          // Single source of received data; CommunicationScreen subscribes here.
          const sub = manager.monitorCharacteristicForDevice(
            connected.id,
            NUS_SERVICE,
            NUS_TX,
            (err, characteristic) => {
              if (err) return;
              // Deliver the raw base64 value; the screen decodes it (like Classic).
              if (characteristic?.value) cb({ data: characteristic.value });
            }
          );
          return { remove: () => sub.remove() };
        },
      };

      setConnectedDevice(connectedWrapper);
      setMessages([]);
      const remembered: ScannedDevice = { id: connected.id, name: device.name || connected.name, address: connected.id };
      saveLastConnectedDevice(remembered);
      rememberDevice(remembered);
      setIsConnecting(false);
    }
    catch (e) {
      setIsConnecting(false);
      Alert.alert("Hata", "Bağlantı kurulamadı.");
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      Alert.alert(
        "Bağlantıyı Kes",
        "Bağlantı kesilecek. Emin misiniz?",
        [
          {
            text: "Vazgeç",
            style: "cancel",
          },
          {
            text: "Kes",
            style: "destructive",
            onPress: async () => {
              setManuallyDisconnected(true);
              await connectedDevice.disconnect();
              setConnectedDevice(null);
              setMessages([]);
              ToastAndroid.show("Bağlantı kesildi", ToastAndroid.SHORT);
            },
          },
        ]
      );
    }
  };

  const renderDevice = ({ item }: { item: ScannedDevice }) => {

    const isConnected = connectedDevice?.address === item.address;
    const isPaired = !!item.bonded && !isConnected;
    const cardStyle = isConnected ? styles.connectedCard : isPaired ? styles.pairedCard : styles.newCard;
    const iconColor = isConnected ? "#fff" : isPaired ? "#0284C7" : "#64748B";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceListItem,
          cardStyle,
          pressed && styles.deviceListItemPressed
        ]}
        onPress={() => isConnected ? disconnectDevice() : connectToDevice(item)}
      >
        <View style={[styles.listIconCircle, isConnected && styles.connectedIconCircle]}>
          <Icon name={isConnected ? "bluetooth-connect" : "bluetooth"} size={22} color={iconColor} />
        </View>
        <View style={styles.listTextSection}>
          <Text style={styles.deviceName} numberOfLines={1}>{item.name || "Bilinmeyen Cihaz"}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, isConnected ? styles.connectedBadge : isPaired ? styles.pairedBadge : styles.newBadge]}>
               <Text style={[styles.statusBadgeText, isConnected ? styles.connectedBadgeText : isPaired ? styles.pairedBadgeText : styles.newBadgeText]}>
                 {isConnected ? "BAĞLI" : isPaired ? "EŞLEŞMİŞ" : "YENİ CİHAZ"}
               </Text>
            </View>
          </View>
        </View>
        <Icon name={isConnected ? "link-off" : "chevron-right"} size={24} color={isConnected ? "#EF4444" : isPaired ? "#7DD3FC" : "#CBD5E1"} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <TouchableOpacity onPress={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })} style={styles.homeBtn}>
          <Icon name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="bluetooth" size={32} color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"} />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <View style={styles.connectingBadge}>
                    <ActivityIndicator size="small" color="#F59E0B" style={styles.smallSpinner} />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                  </View>
                ) : connectedDevice ? (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Bağlandı</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <View style={styles.offlineDot} />
                    <Text style={styles.offlineText}>Bağlı Değil</Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoText}>{isConnecting ? "Lütfen bekleyin..." : connectedDevice ? connectedDevice.name : "Cihaz seçilmedi"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={openBluetoothModal} disabled={isConnecting}>
            <Text style={styles.scanBtnText}>Cihaz Ara ve Bağlan</Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.communicationBtn} onPress={() => navigation.navigate('Communication')}>
            <View style={styles.communicationBtnContent}>
              <Icon name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {lastConnectedDevice && !connectedDevice && !isConnecting && (
          <TouchableOpacity
            style={styles.lastDeviceCard}
            onPress={() => connectToDevice(lastConnectedDevice)}
            disabled={isConnecting}
          >
            <View style={styles.lastDeviceIconCircle}>
              <Icon name="history" size={24} color="#0284C7" />
            </View>
            <View style={styles.lastDeviceTextSection}>
              <Text style={styles.lastDeviceLabel}>Son Bağlanan Cihaz</Text>
              <Text style={styles.lastDeviceName}>{lastConnectedDevice.name || "Bilinmeyen Cihaz"}</Text>
              <Text style={styles.lastDeviceAddress}>{lastConnectedDevice.address}</Text>
            </View>
            {isConnecting ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <Icon name="flash" size={24} color="#0284C7" />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { height: SCREEN_HEIGHT, transform: [{ translateY: panY }] }]}>
            <View style={{ flex: 1 }}>
              <View {...panResponder.panHandlers} style={styles.interactiveHeader}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeaderContent}>
                  <View style={styles.titleWrapper}>
                    <View style={styles.titleIconCircle}>
                      <Icon name="bluetooth" size={20} color="#0984e3" />
                    </View>
                    <Text style={styles.modalTitle}>Bluetooth Cihazları</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={styles.closeCircle}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {scanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="small" color="#0984e3" />
                  <Text style={styles.scanningIndicatorText}>Yakındaki cihazlar taranıyor...</Text>
                </View>
              )}

              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                renderItem={renderDevice}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.listContentStyle, { paddingBottom: insets.bottom + 35, paddingTop: insets.top - 35 }]}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={!scanning ? <Text style={styles.emptyStateText}>Cihaz bulunamadı</Text> : null}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
