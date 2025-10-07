import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ====== Main Container ======
  container: {
    flex: 1,
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
    paddingBottom: 100,
  },

  // ====== Appliance Group Card ======
  applianceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: "#E0E0E0",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  applianceTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 8,
    color: "#2E2E2E",
  },
  applianceLocation: {
    fontSize: 13,
    color: "#6A6A6A",
    marginBottom: 10,
    marginLeft: 30, // aligns with icon start
  },

  // ====== Recommendation Items ======
  recommendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5FAF5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    transform: [{ scale: 1 }],
  },
  recommendDesc: {
    flex: 1,
    fontSize: 14.5,
    color: "#333",
    lineHeight: 20,
  },

  // ====== Section Titles ======
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
    marginVertical: 12,
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
    backgroundColor: "#A8E6CF",
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

  // ====== Animations / Transitions ======
  fadeInUp: {
    opacity: 0,
    transform: [{ translateY: 10 }],
  },

  // ====== Info Texts ======
  infoText: {
    textAlign: "center",
    color: "#6A6A6A",
    fontSize: 13,
    marginBottom: 10,
  },
  skippedText: {
    textAlign: "center",
    color: "#999",
    fontSize: 13,
    marginBottom: 10,
  },

  // ====== Loading ======
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
});
