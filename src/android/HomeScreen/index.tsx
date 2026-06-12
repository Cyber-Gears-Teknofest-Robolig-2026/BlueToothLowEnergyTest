import {
    StatusBar, 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import { AppNavigationProp } from "../constants";
import { useTheme } from "@react-navigation/native";

const BluetoothConnectionButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('BluetoothConnection')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#E0F2FE" }]}>
        <Icon name="bluetooth" size={30} color="#0284C7" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Bluetooth Bağlantısı</Text>
        <Text style={styles.menuDesc}>Cihazları tara, eşleş ve yönet</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const CommunicationButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('Communication')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#DCFCE7" }]}>
        <Icon name="swap-horizontal" size={30} color="#15803D" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Cihaz İletişimi</Text>
        <Text style={styles.menuDesc}>Bağlı cihaz ile veri alışverişi yap</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[
        "top",
        "left",
        "right",
        "bottom"
      ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={[styles.mainHeader, { paddingHorizontal: 25 }]}>
        <Text style={styles.mainHeaderText}>BlueTooth Classic Test</Text>
        <Text style={styles.subHeaderText}>Lütfen bir işlem seçin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BluetoothConnectionButton />
        <CommunicationButton />
      </ScrollView>
      
    </SafeAreaView>
  );
};