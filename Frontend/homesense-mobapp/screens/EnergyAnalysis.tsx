import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { styles } from "./styles/EnergyAnalysisStyles";

interface ComparisonData {
  current: number;
  previous: number;
  diffPercent: number;
}
interface ApplianceDiscrepancy {
  appliance_name: string;
  currentMonth: number;
  previousMonth: number;
  difference: number;
  status: "increase" | "decrease" | "no change";
}

interface MonthlyDiscrepancyResponse {
  appliances: ApplianceDiscrepancy[];
}
interface Props {
  weeklyComparison?: ComparisonData | null;
  monthlyComparison?: ComparisonData | null;
  applianceMonthlyDiscrepancies?: Record<
    string,
    { current: number; previous: number; diffPercent: number }
  >;
}

const PerformanceSummaryCard: React.FC<Props> = ({
  weeklyComparison,
  monthlyComparison,
  applianceMonthlyDiscrepancies: applianceDiscrepanciesProp,
}) => {
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [showMore, setShowMore] = useState(false);

  // Transform the prop to the shape expected by the render
  const applianceMonthlyDiscrepancies: Record<
    string,
    { currentMonth: number; previousMonth: number; difference: number }
  > = {};

  if (applianceDiscrepanciesProp && viewMode === "monthly") {
    Object.entries(applianceDiscrepanciesProp).forEach(([name, data]) => {
      applianceMonthlyDiscrepancies[name] = {
        currentMonth: data.current,
        previousMonth: data.previous,
        difference: data.diffPercent,
      };
    });
  }

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
      {/* SEE MORE BUTTON ONLY FOR MONTHLY */}
      {viewMode === "monthly" &&
        applianceMonthlyDiscrepancies &&
        Object.keys(applianceMonthlyDiscrepancies).length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => setShowMore(!showMore)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: "#f0f0f0",
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#333" }}>
                {showMore ? "Hide details" : "See more"}
              </Text>
            </TouchableOpacity>

            {showMore && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}
                >
                  Appliance Monthly Breakdown
                </Text>

                {Object.entries(applianceMonthlyDiscrepancies).map(
                  ([name, data], index) => {
                    const isSaving = data.difference < 0;
                    const color = isSaving ? "#4CAF50" : "#E53935"; // green/red
                    return (
                      <View
                        key={index}
                        style={{
                          marginBottom: 14,
                          borderRadius: 14,
                          backgroundColor: "#fff",
                          padding: 20,
                          borderLeftWidth: 6,
                          borderLeftColor: color,
                          borderWidth: 1,
                          borderColor: "#f0f0f0",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "bold",
                            marginBottom: 6,
                          }}
                        >
                          {name}
                        </Text>

                        <Text style={{ fontSize: 14, color: "#555" }}>
                          Previous Month:{" "}
                          <Text style={{ fontWeight: "bold", color: "#000" }}>
                            {data.previousMonth.toFixed(2)} kWh
                          </Text>
                        </Text>

                        <Text style={{ fontSize: 14, color: "#555" }}>
                          Current Month:{" "}
                          <Text style={{ fontWeight: "bold", color: "#000" }}>
                            {data.currentMonth.toFixed(2)} kWh
                          </Text>
                        </Text>

                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 15,
                            fontWeight: "600",
                            color,
                          }}
                        >
                          {Math.abs(data.difference).toFixed(1)}%{" "}
                          {isSaving ? "Less usage" : "More usage"}
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>
            )}
          </>
        )}
    </View>
  );
};

export default PerformanceSummaryCard;
