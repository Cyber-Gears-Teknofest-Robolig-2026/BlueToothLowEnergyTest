import {
  Animated,
  PanResponder,
  View,
  useWindowDimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  ScrollView,
  Modal,
  StatusBar,
  Pressable,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useSafeAreaInsets,
  SafeAreaView,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
  ScannedDevice,
} from "../constants";
import { useBluetooth } from "../BluetoothContext";
import { useThemeColors } from "../theme";

export default function BluetoothConnectionScreen() {
  // Bluetooth motoruna SADECE bu hook üzerinden erişilir (native import yok).
  const bt = useBluetooth();
  const colors = useThemeColors();

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();

  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const SNAP_FULL = 0;
  const SNAP_CLOSED = SCREEN_HEIGHT;

  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectedDevice, setLastConnectedDevice] =
    useState<ScannedDevice | null>(null);

  const connectionCancelledRef = useRef(false);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);

  useEffect(() => {
    loadLastConnectedDevice();
    return () => bt.stopScan();
  }, []);

  const loadLastConnectedDevice = async () => {
    try {
      const lastDeviceJson = await AsyncStorage.getItem("lastConnectedDevice");
      if (lastDeviceJson) {
        setLastConnectedDevice(JSON.parse(lastDeviceJson));
      }
    } catch (error) {}
  };

  const saveLastConnectedDevice = async (device: ScannedDevice) => {
    try {
      // Yalnızca serileştirilebilir tanımlayıcıyı sakla (fonksiyonlar değil).
      const descriptor: ScannedDevice = {
        id: device.id,
        address: device.address,
        name: device.name,
        bonded: device.bonded,
        kind: device.kind,
      };
      await AsyncStorage.setItem(
        "lastConnectedDevice",
        JSON.stringify(descriptor)
      );
      setLastConnectedDevice(descriptor);
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
      },
    })
  ).current;

  const animateToPoint = (point: number) => {
    Animated.spring(panY, {
      toValue: point,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start(() => (currentSnapPoint.current = point));
  };

  const closeModal = () => {
    Animated.timing(panY, {
      toValue: SNAP_CLOSED,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      currentSnapPoint.current = SNAP_CLOSED;
    });
    bt.stopScan();
  };

  const openBluetoothModal = async () => {
    // İzinler
    if (!(await bt.requestPermissions())) {
      Alert.alert(
        "İzin Gerekli",
        "Cihazları taramak ve bağlanmak için Bluetooth izinleri gerekli."
      );
      return;
    }

    // Bluetooth açık mı?
    if (!(await bt.ensureEnabled())) {
      Alert.alert("Hata", "Bu ayara girilebilmesi için Bluetooth açık olmalıdır!");
      return;
    }

    setModalVisible(true);
    animateToPoint(SNAP_FULL);

    setDevices([]);
    setScanning(true);

    // İlerlemeli tarama: her yeni cihaz geldikçe listeye eklenir.
    bt.startScan({
      onDevice: (device) => {
        setDevices((prev) => {
          if (prev.some((d) => d.address === device.address)) return prev;
          return [...prev, device];
        });
      },
      onError: () => {
        setScanning(false);
        Alert.alert("Hata", "Cihazlar taranamadı.");
      },
      onComplete: () => setScanning(false),
    });
  };

  const connectToDevice = async (device: ScannedDevice) => {
    try {
      closeModal();
      connectionCancelledRef.current = false;
      setIsConnecting(true);
      const connected = await bt.connect(device);
      if (connectionCancelledRef.current) {
        setManuallyDisconnected(true);
        await connected.disconnect();
        return;
      }
      setConnectedDevice(connected);
      setMessages([]);
      saveLastConnectedDevice(device);
      setIsConnecting(false);
    } catch (e) {
      if (!connectionCancelledRef.current) {
        Alert.alert("Hata", "Bağlantı kurulamadı.");
      }
      setIsConnecting(false);
    }
  };

  const cancelConnection = () => {
    connectionCancelledRef.current = true;
    setIsConnecting(false);
    Alert.alert("Bilgi", "Bağlantı iptal edildi");
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      Alert.alert("Bağlantıyı Kes", "Bağlantı kesilecek. Emin misiniz?", [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kes",
          style: "destructive",
          onPress: async () => {
            setManuallyDisconnected(true);
            await connectedDevice.disconnect();
            setConnectedDevice(null);
            setMessages([]);
            Alert.alert("Bilgi", "Bağlantı kesildi");
          },
        },
      ]);
    }
  };

  const renderDevice = ({ item }: { item: ScannedDevice }) => {
    const isConnected = connectedDevice?.address === item.address;
    const isPaired = item.bonded;
    const cardStyle = isConnected
      ? { backgroundColor: colors.successSoft, borderColor: colors.success }
      : isPaired
      ? { backgroundColor: colors.surface, borderColor: colors.primary }
      : { backgroundColor: colors.surface, borderColor: colors.border };
    const iconColor = isConnected ? "#fff" : isPaired ? colors.primary : colors.textSecondary;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceListItem,
          cardStyle,
          pressed && styles.deviceListItemPressed,
        ]}
        onPress={() => (isConnected ? disconnectDevice() : connectToDevice(item))}
      >
        <View style={[styles.listIconCircle, isConnected && { backgroundColor: colors.success }]}>
          <Icon
            name={isConnected ? "bluetooth-connect" : "bluetooth"}
            size={22}
            color={iconColor}
          />
        </View>
        <View style={styles.listTextSection}>
          <Text style={[styles.deviceName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name || "Bilinmeyen Cihaz"}
          </Text>
          <Text style={[styles.deviceAddress, { color: colors.textSecondary }]}>{item.address}</Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isConnected
                    ? colors.successSoft
                    : isPaired
                    ? colors.primarySoft
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isConnected
                      ? colors.success
                      : isPaired
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
              >
                {isConnected ? "BAĞLI" : isPaired ? "EŞLEŞMİŞ" : "YENİ CİHAZ"}
              </Text>
            </View>
          </View>
        </View>
        <Icon
          name={isConnected ? "link-off" : "chevron-right"}
          size={24}
          color={isConnected ? colors.danger : isPaired ? colors.primary : colors.textMuted}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Icon name="arrow-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bluetooth Yönetimi</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Home" }] })
          }
          style={[styles.homeBtn, { backgroundColor: colors.surface }]}
        >
          <Icon name="home" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Icon
              name="bluetooth"
              size={32}
              color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <TouchableOpacity
                    style={styles.connectingBadge}
                    onPress={cancelConnection}
                    activeOpacity={0.7}
                  >
                    <ActivityIndicator
                      size="small"
                      color="#F59E0B"
                      style={styles.smallSpinner}
                    />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                    <Icon name="close-circle" size={14} color="#D97706" />
                  </TouchableOpacity>
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
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                {isConnecting
                  ? "Lütfen bekleyin..."
                  : connectedDevice
                  ? connectedDevice.name
                  : "Cihaz seçilmedi"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }]}
            onPress={openBluetoothModal}
            disabled={isConnecting}
          >
            {isConnecting && <ActivityIndicator size="small" color="#fff" />}
            <Text style={styles.scanBtnText}>
              {isConnecting ? "Bağlanıyor..." : "Cihaz Ara ve Bağlan"}
            </Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectedDevice && !isConnecting && (
          <TouchableOpacity
            style={styles.communicationBtn}
            onPress={() => navigation.navigate("Communication")}
          >
            <View style={styles.communicationBtnContent}>
              <Icon name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
            </View>
          </TouchableOpacity>
        )}

        {lastConnectedDevice && !connectedDevice && !isConnecting && (
          <TouchableOpacity
            style={[styles.lastDeviceCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => connectToDevice(lastConnectedDevice)}
            disabled={isConnecting}
          >
            <View style={[styles.lastDeviceIconCircle, { backgroundColor: colors.primarySoft }]}>
              <Icon name="history" size={24} color={colors.primary} />
            </View>
            <View style={styles.lastDeviceTextSection}>
              <Text style={[styles.lastDeviceLabel, { color: colors.primary }]}>Son Bağlanan Cihaz</Text>
              <Text style={[styles.lastDeviceName, { color: colors.textPrimary }]}>
                {lastConnectedDevice.name || "Bilinmeyen Cihaz"}
              </Text>
              <Text style={[styles.lastDeviceAddress, { color: colors.textSecondary }]}>
                {lastConnectedDevice.address}
              </Text>
            </View>
            {isConnecting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="flash" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <SafeAreaProvider>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBox,
                { height: SCREEN_HEIGHT, transform: [{ translateY: panY }], backgroundColor: colors.background },
              ]}
            >
              <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
                <View {...panResponder.panHandlers} style={styles.interactiveHeader}>
                  <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
                  <View style={styles.modalHeaderContent}>
                    <View style={styles.titleWrapper}>
                      <View style={[styles.titleIconCircle, { backgroundColor: colors.primarySoft }]}>
                        <Icon name="bluetooth" size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Bluetooth Cihazları</Text>
                    </View>
                    <TouchableOpacity onPress={closeModal} style={[styles.closeCircle, { backgroundColor: colors.border }]}>
                      <Icon name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {scanning && (
                  <View style={[styles.scanningIndicator, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.scanningIndicatorText, { color: colors.primary }]}>
                      Yakındaki cihazlar taranıyor...
                    </Text>
                  </View>
                )}

                <FlatList
                  data={devices}
                  keyExtractor={(item) => item.address}
                  renderItem={renderDevice}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.listContentStyle,
                    { paddingBottom: insets.bottom + 35, paddingTop: insets.top - 35 },
                  ]}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  ListEmptyComponent={
                    !scanning ? (
                      <Text style={styles.emptyStateText}>Cihaz bulunamadı</Text>
                    ) : null
                  }
                />
              </SafeAreaView>
            </Animated.View>
          </View>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}
