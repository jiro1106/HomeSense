import { StyleSheet } from "react-native";

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Small logo row at top-left
  logoContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  logoTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTextH: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFD600",
  },
  logoIcon: {
    width: 25,
    height: 25,
    resizeMode: "contain",
    marginHorizontal: -1,
  },
  logoText: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFD600",
  },

  // Main content
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#111827", // near-black
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF", // gray
    marginBottom: 22,
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#6B7280", // gray-500
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB", // light gray border
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  joinContainer: {
    paddingVertical: 10,
    color: "#6B7280",
  },

  joinToggleButton: {
    flexDirection: "row",
    textAlign: "center",
    alignItems: "center",
    color: "#6B7280",
    marginBottom: 10,
  },

  joinText: {
    color: "#6B7280",
    fontSize: 15,
  },
  // Password input with eye icon
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },

  // Button
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFD600",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  // Footer link
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  footerLink: {
    fontSize: 14,
    color: "#1E40AF", // blue
    fontWeight: "500",
    marginLeft: 4,
  },
    backButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
   // ===== CODE INPUT STYLES =====
  codeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },

  codeInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: "600",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    letterSpacing: 8,
    textAlign: "center",
  },

  codeCharCount: {
    position: "absolute",
    right: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  codeCharCountText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  // ===== HELPER TEXT =====
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },

  // ===== TERMS & CONDITIONS =====
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  termsText: {
    fontSize: 14,
    color: "#374151",
  },
  termsLink: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
  },

  // ===== MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    height: "85%",
    width: "100%",
    minHeight: 0,
    alignSelf: "stretch",
  },
  modalHeader: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
    marginBottom: 6,
  },
  modalParagraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'justify',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
});
