import {
  StatusBar,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import { AppNavigationProp } from "../constants";
import {
  useThemeColors,
  useThemeStore,
  useEffectiveTheme,
  type ThemeMode,
} from "../theme";

type MaterialCommunityIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const BluetoothConnectionButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate("BluetoothConnection")}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: colors.primarySoft }]}>
        <MaterialCommunityIcons name="bluetooth" size={30} color={colors.primary} />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
          Bluetooth Bağlantısı
        </Text>
        <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
          Cihazları tara, eşleş ve yönet
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const CommunicationButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate("Communication")}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: colors.successSoft }]}>
        <MaterialCommunityIcons name="swap-horizontal" size={30} color={colors.success} />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
          Cihaz İletişimi
        </Text>
        <Text style={[styles.menuDesc, { color: colors.textSecondary }]}>
          Bağlı cihaz ile veri alışverişi yap
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const ThemeToggle = () => {
  const colors = useThemeColors();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const Btn = ({
    value,
    icon,
  }: {
    value: ThemeMode;
    icon: MaterialCommunityIconName;
  }) => {
    const active = mode === value;
    return (
      <TouchableOpacity
        onPress={() => setMode(value)}
        style={{
          padding: 10,
          borderRadius: 12,
          backgroundColor: active ? colors.primarySoft : "transparent",
          marginLeft: 6,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={active ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Btn value="light" icon="weather-sunny" />
      <Btn value="dark" icon="weather-night" />
      <Btn value="system" icon="theme-light-dark" />
    </View>
  );
};

export default function HomeScreen() {
  const colors = useThemeColors();
  const effective = useEffectiveTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={effective === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View
        style={[
          styles.mainHeader,
          {
            paddingHorizontal: 25,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.mainHeaderText, { color: colors.textPrimary }]}>
            BlueTooth Low Energy Test
          </Text>
          <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
            Lütfen bir işlem seçin
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BluetoothConnectionButton />
        <CommunicationButton />
      </ScrollView>
    </SafeAreaView>
  );
}
