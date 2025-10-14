import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%",
    borderRadius: 12,
    marginVertical: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: {
    paddingBottom: 5,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "80%",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    marginLeft: 5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginLeft: 40,
    paddingBottom: 5,
  },
  savingsText: {
    fontWeight: "bold",
  },
  high: {
    color: "red",
  },
  medium: {
    color: "#F59E0B",
  },
  low: {
    color: "#22C55E",
  },
  noData: {
    color: "#999",
  },
});
