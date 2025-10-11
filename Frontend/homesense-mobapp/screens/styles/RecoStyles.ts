import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ====== Main Container ======
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // ====== Page Title ======
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000ff", // deep eco-green
    paddingHorizontal: 20,
    paddingVertical: 12,
    textAlign: "center",
    marginTop: 10,
  },

  // ====== Content Scroll ======
  content: {
    paddingHorizontal: 16,
  },
  usageCard: {
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  usageTextContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: 20,
    width: "75%",
    marginHorizontal: 20,
  },
  usageValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginTop: 4,
  },
  usageKwh: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "600",
    color: "#2b8011ff",
  },
  usageNote: {
    fontWeight: "600",
    fontSize: 14,
    color: "#000000af",
    marginTop: 10,
  },
  belowThresholdText: {
    color: "#000000af",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 15,
  },

  filterButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 5,
    marginBottom: 10,
  },
  // ====== Appliance Group Card ======
  applianceCard: {
    flexDirection: "column",
    backgroundColor: "#ffd90021",
    // borderWidth: 1.5,
    // borderColor: "#000000ff",
    padding: 16,
    marginVertical: 10,
    borderRadius: 18,
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  cardContent: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "80%",
    marginLeft: 10,
  },
  cardHeader: {
    marginBottom: 6,
  },
  applianceTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E2E2E",
  },
  applianceLocation: {
    fontSize: 13,
    color: "#020000ff",
    marginTop: 2,
    marginBottom: 10,
  },

  // ====== Recommendation Items ======
  recommendItem: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginVertical: 10,
    textAlign: "right",
    backgroundColor: "#221a6623",
    padding: 5,
    width: "100%",
    height: 100,
    borderRadius: 18,
  },
  recommendDesc: {
    width: "80%",
    fontSize: 13,
    color: "#000000ff",
    fontWeight: "bold",
    marginHorizontal: 20,
    lineHeight: 20,
    marginLeft: 10,
    marginRight: 10,
  },

  // ====== Bottom Navigation ======
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E1E1E",
    borderTopWidth: 0.5,
    borderTopColor: "#333",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    backgroundColor: "#FFD700",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
