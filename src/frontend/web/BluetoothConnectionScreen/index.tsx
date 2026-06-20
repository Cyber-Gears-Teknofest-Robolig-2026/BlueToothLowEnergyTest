import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import type { AppNavigationProp } from "../constants";
import { useBluetoothStore } from "../constants";
import { useBluetooth } from "../BluetoothContext";
import { useThemeColors, useEffectiveTheme } from "../theme";

export default function BluetoothConnectionScreen() {
  const colors = useThemeColors();
  const effective = useEffectiveTheme();

  // Bluetooth motoruna SADECE bu hook üzerinden erişilir (native import yok).
  const bt = useBluetooth();

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();

  const [isConnecting, setIsConnecting] = useState(false);

  const selectAndConnect = async () => {
    if (!(await bt.isEnabled())) {
      if (typeof window !== "undefined") {
        window.alert(
          "Hata: Tarayıcınız Web Serial API desteklemiyor. Chrome veya Edge kullanın."
        );
      }
      return;
    }
    try {
      setIsConnecting(true);
      const connected = await bt.connect();
      setConnectedDevice(connected);
      setDeviceName(connected.name);
      setMessages([]);
      // Yeni bağlantı: önceki manuel kesmeden kalan bayrağı temizle, yoksa
      // sıradaki gerçek kopma uyarısı yanlışlıkla bastırılır.
      setManuallyDisconnected(false);
    } catch (e: any) {
      // Kullanıcı port seçiciyi iptal ettiyse sessiz geç; gerçek bir bağlantı
      // hatasında kullanıcıyı bilgilendir (aksi halde "hiç denemedi" gibi görünür).
      const cancelled = e?.name === "NotFoundError" || e?.name === "AbortError";
      if (!cancelled && typeof window !== "undefined") {
        const msg = String(e?.message ?? "");
        // "Failed to open serial port" → COM portu meşgul: çoğunlukla başka bir
        // sekme/uygulama portu açık tutuyor ya da cihaz henüz hazır değil.
        const busy = /failed to open/i.test(msg);
        window.alert(
          busy
            ? "Bağlantı kurulamadı: Port meşgul.\n" +
                "Bu cihaz başka bir sekmede veya uygulamada açık olabilir. " +
                "Diğer sekmeyi kapatıp birkaç saniye sonra tekrar deneyin."
            : "Bağlantı kurulamadı: " + (msg || "Bilinmeyen hata")
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      const confirmed = window.confirm("Cihaz bağlantısı kesilsin mi?");
      if (confirmed) {
        setManuallyDisconnected(true);
        await connectedDevice.disconnect();
        setConnectedDevice(null);
        setDeviceName(null);
        setMessages([]);
      }
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={effective === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Icon name="arrow-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bluetooth Yönetimi</Text>
        <TouchableOpacity
          onPress={() => {
            const idx = navigation.getState()?.index ?? 0;
            if (idx > 0 && typeof window !== "undefined") {
              window.history.go(-idx);
            } else {
              navigation.navigate("Home");
            }
          }}
          style={[styles.homeBtn, { backgroundColor: colors.surface }]}
        >
          <Icon name="home" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <View style={styles.infoRow}>
          <Icon
            name="bluetooth"
            size={32}
            color={isConnecting ? colors.warning : connectedDevice ? colors.success : colors.danger}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.statusLabelRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>BAĞLANTI DURUMU</Text>
              {isConnecting ? (
                <View style={styles.connectingBadge}>
                  <ActivityIndicator
                    size="small"
                    color="#F59E0B"
                    style={styles.smallSpinner}
                  />
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
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>
              {isConnecting
                ? "Lütfen bekleyin..."
                : connectedDevice
                ? deviceName || "Seri Cihaz"
                : "Cihaz seçilmedi"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.scanBtn, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }]}
          onPress={selectAndConnect}
          disabled={isConnecting}
        >
          {isConnecting && <ActivityIndicator size="small" color="#fff" />}
          <Text style={styles.scanBtnText}>
            {isConnecting ? "Bağlanıyor..." : "Cihaz Seç ve Bağlan"}
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
    </SafeAreaView>
  );
}
