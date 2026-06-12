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
import { Buffer } from "buffer";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
} from "../constants";

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

export default function CommunicationScreen() {

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

  const currentMessageId = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        let raw = event.data;
        let receivedData = raw;
        try {
          // if looks like base64 (basic check) decode, otherwise use raw
          if (typeof raw === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length % 4 === 0) {
            receivedData = Buffer.from(raw, 'base64').toString('utf-8');
          }
        } catch (e) {
          receivedData = raw;
        }

        receivedData = (receivedData || '').toString().trim();
        if (!receivedData) return;

        setMessages([
          ...messages,
          {
            id: currentMessageId.current,
            text: receivedData,
            mode: "received",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        console.log("Message ID:", currentMessageId.current);

        currentMessageId.current++;
      });
    }

    return () => {
      if (readSubscriptionRef.current) {
        readSubscriptionRef.current.remove();
        readSubscriptionRef.current = null;
      }
    };
  }, [connectedDevice, messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const sendedData = inputText.trim();

    try {
      if (connectedDevice) {
        await connectedDevice.write(sendedData + "\r\n");
      }

      setMessages([
        ...messages,
        {
          id: currentMessageId.current,
          text: sendedData,
          mode: "sent",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      console.log("Message ID:", currentMessageId.current);

      currentMessageId.current++;

      setInputText("");
      scrollToBottom(true, 150);
    } catch (e) {
      Alert.alert("Hata", "Veri gönderilemedi. Cihaz bağlı mı?");
    }
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
            currentMessageId.current = 0;
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {connectedDevice?.name || "Bağlı Değil"}
            </Text>
            <Text
              style={
                connectedDevice ? styles.headerStatusConnected : styles.headerStatusNotConnected
              }
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
            style={styles.headerIconButton}
          >
            <Icon name="home" size={25} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothConnection')}
            style={styles.headerIconButtonCog}
          >
            <Icon name="cog" size={25} color="#000000" />
          </TouchableOpacity>
          {connectedDevice ? (
            <TouchableOpacity
              onPress={disconnectDevice}
              style={styles.headerIconButtonBluetoothOff}
            >
              <Icon name="bluetooth-off" size={25} color="#FF0000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('BluetoothConnection')}
              style={styles.headerIconButtonBluetoothConnect}
            >
              <Icon name="bluetooth-connect" size={25} color="#10B981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={clearMessages}
            style={styles.headerIconButtonTrash}
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
        <View style={styles.messagesContainer}>
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
                    item.mode === "sent"
                      ? styles.messageBubbleSent
                      : styles.messageBubbleReceived,
                  ]}
                >
                  <Text style={styles.messageText} selectable={true}>{item.text}</Text>
                  <View style={styles.messageTimeContainer}>
                    <Text style={styles.messageTime}>{item.time}</Text>
                  </View>
                </View>
              </View>
            )}
            onLayout={() => {
              scrollToBottom(true, 100);
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Mesaj yazın..."
              placeholderTextColor="#54656F"
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
