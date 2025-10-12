import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    backgroundColor: "black",
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 100,
  },
  iconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },
  ecoIcon: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    height: 100,
    backgroundColor: "#FFD700",
    padding: 20,
    borderRadius: 50,
  },
  chooseMode: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  instructions: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
    lineHeight: 20,
    textAlign: "center",
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  eachModeDesc: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
    lineHeight: 20,
  },
  optionButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    // borderWidth: 1,
    // borderColor: "#ddd",
    // shadowColor: "#000",
    // shadowOpacity: 0.05,
    // shadowRadius: 3,
    // shadowOffset: { width: 0, height: 2 },
    // elevation: 1,
  },

  selectedOption: {
    borderWidth: 3,
    borderColor: "#FFD700",
    backgroundColor: "#ffd90049",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  optionIconContainer: {
    width: 60, //
    height: 60,
    borderRadius: 16,
    backgroundColor: "#ffffffc4",
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    flex: 1, //
    marginLeft: 20,
    flexDirection: "column",
    justifyContent: "center",
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },

  optionDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
});
