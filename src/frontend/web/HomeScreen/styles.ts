import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  mainHeader: { 
    paddingTop: 20, 
    paddingBottom: 10 
  },
  mainHeaderText: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#1E293B" 
  },
  subHeaderText: { 
    fontSize: 16, 
    color: "#64748B", 
    fontWeight: "500", 
    marginTop: 4 
  },
  scrollContent: { 
    paddingHorizontal: 25, 
    paddingTop: 10, 
    paddingBottom: 40, 
    gap: 16 
  },
  menuCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    paddingVertical: 20, 
    paddingHorizontal: 20, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: "#F1F5F9", 
    elevation: 3 
  },
  menuIconCircle: { 
    padding: 14, 
    borderRadius: 18, 
    marginRight: 16 
  },
  menuTextContent: { 
    flex: 1 
  },
  menuTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#1E293B", 
    marginBottom: 4 
  },
  menuDesc: { 
    fontSize: 13, 
    color: "#64748B", 
    fontWeight: "500" 
  },
});

export default styles;