import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { styles } from "./styles/EnergyAnalysisStyles";

interface ComparisonData {
  current: number;
  previous: number;
  diffPercent: number;
}

interface Props {
  weeklyComparison?: ComparisonData | null;
  monthlyComparison?: ComparisonData | null;
}

const PerformanceSummaryCard: React.FC<Props> = ({
  weeklyComparison,
  monthlyComparison,
}) => {
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");

  const comparison =
    viewMode === "weekly" ? weeklyComparison : monthlyComparison;
  const period = viewMode === "weekly" ? "week" : "month";

  if (!comparison) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No {period} data available</Text>
      </View>
    );
  }

  const { current, previous, diffPercent } = comparison;
  const isSaving = diffPercent < 0;
  const color = isSaving ? "#4CAF50" : "#E53935"; // green vs red
  const sign = isSaving ? "-" : "+";
  const diffAmount = Math.abs(current - previous).toFixed(2);

  return (
    <View style={styles.container}>
      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "weekly" && styles.toggleActive,
          ]}
          onPress={() => setViewMode("weekly")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "weekly" && styles.toggleTextActive,
            ]}
          >
            Weekly
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "monthly" && styles.toggleActive,
          ]}
          onPress={() => setViewMode("monthly")}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === "monthly" && styles.toggleTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.dataContainer}>
        <View style={styles.valueBox}>
          <Text style={styles.label}>Previous {period}</Text>
          <Text style={styles.prevValue}>{previous.toFixed(2)} kWh</Text>
        </View>

        <Icon name="compare-arrows" size={28} color="#0f0707ff" />

        <View style={styles.valueBox}>
          <Text style={styles.label}>Current {period}</Text>
          <Text style={styles.currValue}>{current.toFixed(2)} kWh</Text>
        </View>
      </View>

      {/* Difference Section */}
      <View
        style={[
          styles.differenceContainer,
          {
            backgroundColor: isSaving ? "#E8F5E9" : "#FFEBEE",
            borderColor: isSaving ? "#22e232ff" : "#d4122fff",
          }, // light green or light red background
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Icon
            name={isSaving ? "arrow-downward" : "arrow-upward"}
            size={22}
            color={isSaving ? "green" : "red"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.percentText,
              { color, fontWeight: "bold", fontSize: 20 },
            ]}
          >
            {Math.abs(diffPercent).toFixed(1)}%{" "}
            {isSaving ? "Saved" : "More Used"}
          </Text>
        </View>

        <Text style={[styles.differenceText, { color, marginTop: 4 }]}>
          {isSaving
            ? `You saved ${Math.abs(Number(diffAmount)).toFixed(
                2
              )} kWh this ${period}.`
            : `You used ${Math.abs(
                Number(diffAmount)
              )} kWh more this ${period}.`}
        </Text>
      </View>
    </View>
  );
};

export default PerformanceSummaryCard;
