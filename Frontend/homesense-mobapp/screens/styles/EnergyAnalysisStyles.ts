import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  toggleActive: {
    backgroundColor: "#FFD700",
  },
  toggleText: {
    fontWeight: "600",
    color: "#000",
  },
  toggleTextActive: {
    color: "#000",
  },
  dataContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
  },
  valueBox: {
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  prevValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000ff",
  },
  currValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  differenceContainer: {
    marginVertical: 15,
    borderRadius: 12,
    paddingVertical: 20,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
  },
  differenceText: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 5,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
  },
  percentText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
});
