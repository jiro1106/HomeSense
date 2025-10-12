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
    padding: 15,
    borderBottomWidth: 1,
    backgroundColor: "#000000ff",
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
  },
  content: {
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
    lineHeight: 20,
  },
  optionButton: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  selectedOption: {
    backgroundColor: "#FFD700",
  },
});
