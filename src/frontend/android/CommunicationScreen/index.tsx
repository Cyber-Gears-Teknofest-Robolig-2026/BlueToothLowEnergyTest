import { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  TextInput,
  Keyboard,
  Alert,
  View,
  TouchableOpacity,
  Text,
  ToastAndroid,
  ScrollView,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
} from "../constants";
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
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);
  const connectedDeviceName = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);

  //const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const readSubscriptionRef = useRef<any>(null);

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mesaj id'lerini her zaman global store'daki son mesaja göre üretiriz.
  // Ekran navigasyonla yeniden mount olduğunda component-local bir sayaç 0'a
  // dönerken store'daki mesajlar id 0,1,2... ile durur; bu da tekrar eden key
  // (.$0) hatasına yol açar. getState() senkron olduğundan arka arkaya gelen
  // mesajlarda da id'ler benzersiz kalır.
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
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsFocused(false);
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

  useEffect(() => {
    if (connectedDevice) {
      readSubscriptionRef.current = connectedDevice?.onDataReceived((event) => {
        // Backend çözülmüş (decoded) metin yollar; burada ek kod çözme gerekmez.
        const receivedData = (event.data || "").toString().trim();
        if (!receivedData) return;
        appendMessage(receivedData, "received");
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
  };

  const clearMessages = () => {
    if (messages.length === 0) {
      ToastAndroid.show("Silinecek mesaj yok", ToastAndroid.SHORT);
      return;
    }

    Alert.alert(
      "Mesajları Temizle",
      "Ekrandaki bütün mesajlar silinecek. Emin misiniz?",
      [
        {
          text: "Vazgeç",
          style: "cancel",
        },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            ToastAndroid.show("Mesajlar Silindi", ToastAndroid.SHORT);
          },
        },
      ]
    );
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
              try {
                setManuallyDisconnected(true);
                if (readSubscriptionRef.current) {
                  readSubscriptionRef.current.remove();
                  readSubscriptionRef.current = null;
                }
                await connectedDevice.disconnect();
                setConnectedDevice(null);
                //navigation.goBack();
                ToastAndroid.show("Bağlantı kesildi", ToastAndroid.SHORT);
              } catch (e) {
                ToastAndroid.show("Bağlantı kesilemedi", ToastAndroid.SHORT);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
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
              {connectedDevice?.name || "Bağlı Değil"}
            </Text>
            <Text
              style={[
                connectedDevice ? styles.headerStatusConnected : styles.headerStatusNotConnected,
                { color: connectedDevice ? colors.success : colors.danger },
              ]}
            >
              {connectedDevice ? "Çevrimiçi" : "Çevrimdışı"}
            </Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })}
            style={[styles.headerIconButton, { backgroundColor: colors.background }]}
          >
            <Icon name="home" size={25} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothConnection')}
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
              onPress={() => navigation.navigate('BluetoothConnection')}
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={[styles.messagesContainer, { backgroundColor: colors.background }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={styles.messagesContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageWrapper,
                  item.mode === "sent"
                    ? styles.messageWrapperSent
                    : styles.messageWrapperReceived,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    { backgroundColor: item.mode === "sent" ? colors.sentBubble : colors.receivedBubble },
                  ]}
                >
                  <Text style={[styles.messageText, { color: item.mode === "sent" ? colors.sentText : colors.receivedText }]} selectable={true}>{item.text}</Text>
                  <View style={styles.messageTimeContainer}>
                    <Text style={[styles.messageTime, { color: effective === "dark" ? "#94A3B8" : "#667781" }]}>{item.time}</Text>
                  </View>
                </View>
              </View>
            )}
            onLayout={() => {
              scrollToBottom(true, 100);
            }}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>

            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.textPrimary }]}
              placeholder="Mesaj yazın..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                //setIsFocused(true);
                //scrollToBottom(true, 150);
              }}
              onBlur={() => setIsFocused(false)}
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                !inputText.trim() ? styles.sendButtonDisabled : styles.sendButtonEnabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Icon name="send" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/*{inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
              >
                <Icon name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cameraButton}>
                <Icon name="camera" size={24} color="#54656F" />
              </TouchableOpacity>
            )}*/}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
