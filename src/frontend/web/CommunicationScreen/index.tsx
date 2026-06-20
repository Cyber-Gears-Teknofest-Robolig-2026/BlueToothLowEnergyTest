import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Keyboard,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import type { AppNavigationProp } from "../constants";
import { useBluetoothStore } from "../constants";
import type { Subscription } from "../BluetoothContext";
import { useThemeColors, useEffectiveTheme } from "../theme";

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

export default function CommunicationScreen() {
  const colors = useThemeColors();
  const effective = useEffectiveTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const readSubscriptionRef = useRef<Subscription | null>(null);

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mesaj id'lerini her zaman global store'daki son mesaja göre üretiriz.
  // Böylece ekran navigasyonla yeniden mount olduğunda (component-local bir
  // sayaç 0'a dönerken store'daki mesajlar id 0,1,2... ile durduğu için)
  // tekrar eden key (.$0) hatası oluşmaz. getState() senkron olduğundan
  // arka arkaya gelen mesajlarda da id'ler benzersiz kalır.
  const appendMessage = useCallback(
    (text: string, mode: "sent" | "received") => {
      const current = useBluetoothStore.getState().messages;
      const id = current.length > 0 ? current[current.length - 1].id + 1 : 0;
      setMessages([
        ...current,
        {
          id,
          text,
          mode,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    },
    [setMessages]
  );

  const scrollToBottom = useCallback((animated = true, delay = 100) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    requestAnimationFrame(() => {
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, delay);
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      scrollToBottom(true, 100);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true, 100);
    }
  }, [messages, scrollToBottom]);

  // Gelen veriyi dinle (backend birleşik onDataReceived arayüzü sağlar).
  useEffect(() => {
    if (connectedDevice) {
      readSubscriptionRef.current = connectedDevice.onDataReceived((event) => {
        const text = (event.data || "").toString().trim();
        if (!text) return;
        appendMessage(text, "received");
      });
    }

    return () => {
      if (readSubscriptionRef.current) {
        readSubscriptionRef.current.remove();
        readSubscriptionRef.current = null;
      }
    };
  }, [connectedDevice, appendMessage]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const sendedData = inputText.trim();

    try {
      if (connectedDevice) {
        await connectedDevice.write(sendedData + "\r\n");
      }
    } catch (e) {
      // Cihaza yazma başarısızsa mesajı yine de yerelde göster.
    }

    appendMessage(sendedData, "sent");

    setInputText("");
    scrollToBottom(true, 150);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const clearMessages = () => {
    if (messages.length === 0) {
      window.alert("Bilgi: Silinecek mesaj yok");
      return;
    }

    if (window.confirm("Ekrandaki bütün mesajlar silinecek. Emin misiniz?")) {
      setMessages([]);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      if (window.confirm("Bağlantı kesilecek. Emin misiniz?")) {
        try {
          setManuallyDisconnected(true);
          if (readSubscriptionRef.current) {
            readSubscriptionRef.current.remove();
            readSubscriptionRef.current = null;
          }
          await connectedDevice.disconnect();
        } finally {
          setConnectedDevice(null);
          setDeviceName(null);
          setMessages([]);
          // Manuel kesmede bağlantı ekranına geri dönme; kullanıcı Communication
          // ekranında kalmaya devam etsin (android davranışıyla aynı).
        }
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.mode === "sent";
    return (
      <View
        style={[
          styles.messageWrapper,
          isSent ? styles.messageWrapperSent : styles.messageWrapperReceived,
        ]}
        key={item.id}
      >
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: isSent ? colors.sentBubble : colors.receivedBubble },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isSent ? colors.sentText : colors.receivedText },
            ]}
            selectable
          >
            {item.text}
          </Text>
          <View style={styles.messageTimeContainer}>
            <Text
              style={[
                styles.messageTime,
                { color: effective === "dark" ? "#94A3B8" : "#667781" },
              ]}
            >
              {item.time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={effective === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.surface}
      />

      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {deviceName || "Bağlı Değil"}
            </Text>
            <Text
              style={[
                connectedDevice
                  ? styles.headerStatusConnected
                  : styles.headerStatusNotConnected,
                { color: connectedDevice ? colors.success : colors.danger },
              ]}
            >
              {connectedDevice ? "Çevrimiçi" : "Çevrimdışı"}
            </Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => {
              const idx = navigation.getState()?.index ?? 0;
              if (idx > 0 && typeof window !== "undefined") {
                window.history.go(-idx);
              } else {
                navigation.navigate("Home");
              }
            }}
            style={[styles.headerIconButton, { backgroundColor: colors.background }]}
          >
            <Icon name="home" size={25} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("BluetoothConnection")}
            style={[styles.headerIconButtonCog, { backgroundColor: colors.surface }]}
          >
            <Icon name="cog" size={25} color={colors.textPrimary} />
          </TouchableOpacity>
          {connectedDevice ? (
            <TouchableOpacity
              onPress={disconnectDevice}
              style={[styles.headerIconButtonBluetoothOff, { backgroundColor: colors.surface }]}
            >
              <Icon name="bluetooth-off" size={25} color={colors.danger} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate("BluetoothConnection")}
              style={[styles.headerIconButtonBluetoothConnect, { backgroundColor: colors.surface }]}
            >
              <Icon name="bluetooth-connect" size={25} color={colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={clearMessages}
            style={[styles.headerIconButtonTrash, { backgroundColor: colors.danger }]}
          >
            <Icon name="trash-can" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={[styles.messagesList, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.messagesContent}
      />

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            onKeyPress={(e: any) => {
              const key = e?.nativeEvent?.key ?? e?.key;
              if (key === "Enter") {
                if (typeof e.preventDefault === "function") e.preventDefault();
                sendMessage();
              }
            }}
          />
          <TouchableOpacity
            style={
              !inputText.trim() ? styles.sendButtonDisabled : styles.sendButton
            }
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Icon name="send" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
