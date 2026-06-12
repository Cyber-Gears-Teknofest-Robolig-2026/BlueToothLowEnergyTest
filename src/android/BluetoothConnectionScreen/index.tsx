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
} from "react-native";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { 
  useSafeAreaInsets, 
  SafeAreaView 
} from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import styles from './styles';
import { useNavigation } from "@react-navigation/native";
import { 
  AppNavigationProp,
  useBluetoothStore,
  BluetoothDevice,
} from "../constants";

// Nordic UART Service (common for BLE serial-like communication)
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'.toLowerCase();
const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'.toLowerCase(); // write (from client to device)
const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'.toLowerCase(); // notify (from device to client)

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

  const [devices, setDevices] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectedDevice, setLastConnectedDevice] = useState<any | null>(null);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);

  const managerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const monitorSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    managerRef.current = new BleManager();
    loadLastConnectedDevice();
    return () => {
      try { managerRef.current?.destroy(); } catch (e) {}
    };
  }, []);

  const loadLastConnectedDevice = async () => {
    try {
      const lastDeviceJson = await AsyncStorage.getItem('lastConnectedDevice');
      if (lastDeviceJson) {
        const lastDevice = JSON.parse(lastDeviceJson);
        setLastConnectedDevice(lastDevice);
      }
    } catch (error) {}
  };

  const saveLastConnectedDevice = async (device: any) => {
    try {
      await AsyncStorage.setItem('lastConnectedDevice', JSON.stringify(device));
      setLastConnectedDevice(device);
    } catch (error) {}
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
    try { managerRef.current?.stopDeviceScan(); } catch (e) {}
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
  };

  const openBluetoothModal = async () => {
    // Request required permissions
    const permissionsResult = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    for (const [key, value] of Object.entries(permissionsResult)) {
      if (value !== 'granted') {
        Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan and connect to devices.');
        return;
      }
    }

    setModalVisible(true);
    animateToPoint(SNAP_FULL);

    setScanning(true);
    setDevices([]);

    const manager = managerRef.current!;

    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.warn('Scan error', error);
        setScanning(false);
        return;
      }
      if (!device) return;
      setDevices(prev => {
        const found = prev.find(p => p.id === device.id);
        if (found) return prev;
        return [...prev, { id: device.id, name: device.name, address: device.id }];
      });
    });

    // stop scan after 8s
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      try { manager.stopDeviceScan(); } catch (e) {}
      setScanning(false);
    }, 8000);
  };

  const connectToDevice = async (device: any) => {
    try {
      closeModal();
      setIsConnecting(true);
      const manager = managerRef.current!;
      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();

      // Subscribe to notifications on TX characteristic
      monitorSubscriptionRef.current = manager.monitorCharacteristicForDevice(
        connected.id,
        NUS_SERVICE,
        NUS_TX,
        (error, characteristic) => {
          if (error) {
            console.warn('monitor error', error);
            return;
          }
          if (characteristic?.value) {
            const decoded = Buffer.from(characteristic.value, 'base64').toString('utf8').trim();
            if (decoded) {
              setMessages(prev => [...prev, { id: Date.now(), text: decoded, mode: 'received', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            }
          }
        }
      );

      const connectedWrapper: BluetoothDevice = {
        id: connected.id,
        name: connected.name || device.name,
        address: connected.id,
        write: async (data: string) => {
          const base64 = Buffer.from(data, 'utf8').toString('base64');
          try {
            // Try write with response first
            await manager.writeCharacteristicWithResponseForDevice(connected.id, NUS_SERVICE, NUS_RX, base64);
          } catch (e) {
            // Fallback to without response
            await manager.writeCharacteristicWithoutResponseForDevice(connected.id, NUS_SERVICE, NUS_RX, base64);
          }
        },
        disconnect: async () => {
          try {
            if (monitorSubscriptionRef.current) {
              monitorSubscriptionRef.current.remove();
              monitorSubscriptionRef.current = null;
            }
            await manager.cancelDeviceConnection(connected.id);
          } catch (e) {
            console.warn('disconnect error', e);
          }
        },
        onDataReceived: (cb: any) => {
          // For compatibility; already handled by monitor above which pushes to store.
          // Also provide a subscription-like object for old code paths.
          const sub = manager.monitorCharacteristicForDevice(connected.id, NUS_SERVICE, NUS_TX, (err, characteristic) => {
            if (err) return;
            if (characteristic?.value) {
              cb({ data: Buffer.from(characteristic.value, 'base64').toString('utf8') });
            }
          });
          return { remove: () => sub.remove() };
        }
      };

      setConnectedDevice(connectedWrapper as any);
      setMessages([]);
      saveLastConnectedDevice(device);
      setIsConnecting(false);
    } catch (e) {
      console.warn(e);
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
              try {
                await connectedDevice.disconnect();
              } catch (e) {
                console.warn('disconnect failed', e);
              }
              setConnectedDevice(null);
              setMessages([]);
              ToastAndroid.show("Bağlantı kesildi", ToastAndroid.SHORT);
            },
          },
        ]
      );
    }
  };

  const renderDevice = ({ item }: { item: any }) => {

    const isConnected = connectedDevice?.address === item.address;
    const isPaired = false;
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