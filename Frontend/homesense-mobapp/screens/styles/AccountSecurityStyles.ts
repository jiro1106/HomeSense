import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    backgroundColor: "#000000ff",
  },
  topBar: {
    backgroundColor: "#000000ff",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginRight: 10,
  },
  topBarTitle: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#000",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#888",
  },
  rowInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    marginLeft: 8,
    padding: 6,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  cancelButton2: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignSelf: "flex-start",
    marginLeft: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#cd0202ff",
    fontWeight: "600",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeButton: {
    marginLeft: -40,
    padding: 10,
  },
  saveButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  changePasswordTextButton: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  changePasswordLink: {
    fontSize: 14,
    color: "#cd0202ff",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  // ✅ New: success message style
  successMessage: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "green",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
