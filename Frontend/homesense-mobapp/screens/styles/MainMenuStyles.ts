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
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextH: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
  },
  logoText: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
  },
  logoIcon: {
    width: 24,
    height: 24,
    marginHorizontal: 0,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
    fontWeight: "500",
  },
  usageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  usageCard: {
    flex: 1,
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
    minHeight: 80, // ensures all cards have at least this height
  },
  cardIcon: {
    marginBottom: 8,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    color: "#000",
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  usageLabel: {
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
  billCard: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 25,
  },
  billTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  billAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
  },
  billLabel: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  devicesContainer: {
    marginBottom: 25,
    marginTop: 8,
    minHeight: 60,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  deviceName: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  deviceConsumption: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 15,
    marginBottom: 120, // Space for bottom nav with safe area
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: "#000",
    marginLeft: 15,
    lineHeight: 20,
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
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginVertical: 10,
  },

  noDataText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },

  noDataSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },

  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
