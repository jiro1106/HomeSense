import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerSafeArea: {
    backgroundColor: "#000",
  },
  header: {
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 26,
    height: 26,
    marginRight: 1,
  },
  logoText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    paddingHorizontal: 15,
    paddingVertical: 10,
    textAlign: "center",
    marginTop: 10,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  dropdownContainer: {
    marginRight: 10,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    minWidth: 120,
    backgroundColor: "#f1f1f1",
  },
  dropdownText: {
    fontSize: 14,
    color: "#000",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  toggleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastToggleButton: {
    marginRight: 0,
  },
  toggleText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 13,
  },
  filterButton: {
    backgroundColor: "#FFD700",
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f1f1",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
    color: "#333",
    paddingHorizontal: 4,
  },
  tableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  tableHeaderText: {
    fontWeight: "bold",
    color: "#000",
  },
  rateColumn: {
    flex: 1,
  },
  weekColumn: {
    flex: 1.3, // Give week column more space
  },
  consumptionColumn: {
    flex: 1.3, // Slightly more space for consumption
  },
  billColumn: {
    flex: 1.1, // Slightly more space for bill
  },
  infoColumn: {
    flex: 0.5, // Make info column narrower and push it right
  },
  infoButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 30,
    minHeight: 30,
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  totalContainer: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  totalAmount: {
    color: "red",
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    borderRadius: 10,
  },
  highlightBox: {
    backgroundColor: "#FFD700",
    borderRadius: 10,
    padding: 15,
    marginTop: 30,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  highlightAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginTop: 5,
  },
  forecastBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 50,
  },
  forecastText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    flexShrink: 1,
  },
  forecastAmount: {
    fontWeight: "bold",
    color: "#000",
    marginLeft: "auto",
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  navItem: {
    alignItems: "center",
  },
  fab: {
    backgroundColor: "#FFD700",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
