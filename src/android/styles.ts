
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  
});

/*const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  mainHeader: { paddingTop: 20, paddingBottom: 10 },
  mainHeaderText: { fontSize: 28, fontWeight: "900", color: "#1E293B" },
  subHeaderText: { fontSize: 16, color: "#64748B", fontWeight: "500", marginTop: 4 },
  scrollContent: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 40, gap: 16 }, 
  
  headerWithBack: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  headerSpacer: { width: 40 },

  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingVertical: 20, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: "#F1F5F9", elevation: 3 },
  menuIconCircle: { padding: 14, borderRadius: 18, marginRight: 16 },
  menuTextContent: { flex: 1 },
  menuTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  menuDesc: { fontSize: 13, color: "#64748B", fontWeight: "500" },

  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 15 },
  emptyTitle: { fontSize: 18, color: "#94A3B8" },

  // WhatsApp Chat Stilleri
  chatMainContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  chatHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  chatTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  chatStatus: { fontSize: 12, color: "#10B981", fontWeight: "600" },
  
  chatContent: { paddingHorizontal: 15, paddingVertical: 20 },
  msgWrap: { flexDirection: "row", marginBottom: 8 },
  msgWrapMe: { justifyContent: "flex-end" },
  msgWrapYou: { justifyContent: "flex-start" },
  msgBubble: { maxWidth: "80%", padding: 10, borderRadius: 15, elevation: 1 },
  msgBubbleMe: { backgroundColor: "#DCF8C6", borderTopRightRadius: 2 },
  msgBubbleYou: { backgroundColor: "#F1F5F9", borderTopLeftRadius: 2 },
  msgText: { fontSize: 15, color: "#1E293B" },
  msgTextMe: { color: "#1E293B" },
  msgTextYou: { color: "#1E293B" },

  inputRowContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  inputBubble: { 
    flex: 1, 
    flexDirection: "row", 
    backgroundColor: "#F1F5F9", 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "transparent" 
  },
  inputBubbleFocused: { 
    borderColor: "#075E54", 
    backgroundColor: "#FFFFFF", 
    //elevation: 2 
  },
  textInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 16, 
    color: "#1E293B", 
    paddingVertical: 0 
  },
  sendBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 2 
  },

  // Bluetooth Durum Stilleri
  statusLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1 },
  connectingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 2 },
  connectingText: { fontSize: 10, fontWeight: "900", color: "#F59E0B", textTransform: "uppercase" },
  smallSpinner: { transform: [{ scale: 0.6 }] },
  onlineBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  onlineText: { fontSize: 10, fontWeight: "900", color: "#10B981", textTransform: "uppercase" },
  offlineBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 4 },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  offlineText: { fontSize: 10, fontWeight: "900", color: "#EF4444", textTransform: "uppercase" },
  infoCard: { backgroundColor: "#fff", margin: 20, padding: 25, borderRadius: 28, elevation: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 25 },
  infoText: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  scanBtn: { backgroundColor: "#0984e3", padding: 18, borderRadius: 18, alignItems: "center" },
  scanBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  disconnectBtn: { marginTop: 12, padding: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#F1F5F9" },
  disconnectBtnText: { color: "#EF4444", fontWeight: "800" },

  // Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#F8FAFC", borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', position: 'absolute', width: '100%' },
  interactiveHeader: { width: '100%', paddingTop: 12, paddingBottom: 20 },
  dragHandle: { width: 45, height: 5, backgroundColor: "#CBD5E1", borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  modalHeaderContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 25 },
  titleWrapper: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconCircle: { backgroundColor: "#E0F2FE", padding: 8, borderRadius: 12 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  closeCircle: { backgroundColor: "#E2E8F0", padding: 8, borderRadius: 20 },
  scanningIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE", marginHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 15, gap: 10, borderWidth: 1, borderColor: "#BAE6FD" },
  scanningIndicatorText: { fontSize: 13, color: "#0369A1", fontWeight: "700" },
  emptyStateText: { fontSize: 15, color: "#94A3B8", fontWeight: "600", textAlign: "center", marginTop: 50 },
  listContentStyle: { paddingBottom: 80, paddingHorizontal: 20 },
  separator: { height: 12 },
  deviceListItem: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 16, borderWidth: 1 },
  listTextSection: { flex: 1, marginLeft: 15, gap: 2 },
  deviceName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  deviceAddress: { fontSize: 12, color: "#64748B", fontFamily: "monospace" },
  badgeRow: { marginTop: 6, flexDirection: "row" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  listIconCircle: { padding: 12, borderRadius: 16 },
  newCard: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
  pairedCard: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
  connectedCard: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC", borderWidth: 1.5 },
  connectedIconCircle: { backgroundColor: "#10B981" },
  connectedBadge: { backgroundColor: "#DCFCE7" },
  connectedBadgeText: { color: "#15803D" },
  pairedBadge: { backgroundColor: "#E0F2FE" },
  pairedBadgeText: { color: "#0284C7" },
  newBadge: { backgroundColor: "#F1F5F9" },
  newBadgeText: { color: "#64748B" },
});*/

export default styles;