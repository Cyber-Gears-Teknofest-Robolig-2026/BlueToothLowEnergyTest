import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from './styles';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../constants';
import { useBluetoothStore } from '../constants';

export default function BluetoothConnectionScreen() {
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('serial' in navigator)) {
      window.alert('Hata: Tarayıcınız Web Serial API desteklemiyor. Chrome veya Edge kullanın.');
    }
  }, []);

  const selectAndConnect = async () => {
    if (!('serial' in navigator)) return;

    let port: any;
    try {
      port = await (navigator as any).serial.requestPort();
    } catch (error) {
      return;
    }

    try {
      setIsConnecting(true);
      await port.open({ baudRate: 9600 });

      // Web Serial API'de COM port adı script'e expose edilmiyor.
      // port objesinde ne varsa logla (vendor/product ID dışında bir şey çıkmayacak):
      console.log('port:', port);
      console.log('port.getInfo():', port.getInfo?.());
      console.log('port keys:', Object.keys(port));

      const bluetoothDevice = {
        readable: port.readable,
        writable: port.writable,
        close: async () => {
          await port.close();
        },
      };

      console.log('bluetoothDevice:', bluetoothDevice);

      setConnectedDevice(bluetoothDevice);
      setDeviceName('Seri Port');
      setMessages([]);
    } catch (e) {
      window.alert('Hata: Bağlantı kurulamadı.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      const confirmed = window.confirm("Cihaz bağlantısı kesilsin mi?");
      if (confirmed) {
        setManuallyDisconnected(true);
        await connectedDevice.close();
        setConnectedDevice(null);
        setDeviceName(null);
        setMessages([]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <TouchableOpacity
          onPress={() => {
            const idx = navigation.getState()?.index ?? 0;
            if (idx > 0 && typeof window !== 'undefined') {
              window.history.go(-idx);
            } else {
              navigation.navigate('Home');
            }
          }}
          style={styles.homeBtn}
        >
          <Icon name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Icon
            name="bluetooth"
            size={32}
            color={isConnecting ? '#F59E0B' : connectedDevice ? '#10B981' : '#EF4444'}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.statusLabelRow}>
              <Text style={styles.label}>BAĞLANTI DURUMU</Text>
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
            <Text style={styles.infoText}>
              {isConnecting
                ? 'Lütfen bekleyin...'
                : connectedDevice
                ? deviceName || 'Seri Cihaz'
                : 'Cihaz seçilmedi'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={selectAndConnect}
          disabled={isConnecting}
        >
          <Text style={styles.scanBtnText}>Cihaz Seç ve Bağlan</Text>
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
          onPress={() => navigation.navigate('Communication')}
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
