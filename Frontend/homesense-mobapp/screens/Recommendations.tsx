import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../App";
import { styles } from "./styles/RecoStyles";
import api from "../utils/api";
import EnergyAnalysis from "./EnergyAnalysis";

const getApplianceIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "electric fan":
      return { name: "air", color: "#00BCD4", bg: "#E0F7FA" };
    case "air conditioner":
      return { name: "ac-unit", color: "#03A9F4", bg: "#E1F5FE" };
    case "refrigerator":
      return { name: "kitchen", color: "#4CAF50", bg: "#E8F5E9" };
    case "washing machine":
      return { name: "local-laundry-service", color: "#9C27B0", bg: "#F3E5F5" };
    case "television":
      return { name: "tv", color: "#FF9800", bg: "#FFF3E0" };
    case "computer":
      return { name: "desktop-classic", color: "#795548", bg: "#EFEBE9" };
    case "router/wifi":
      return { name: "wifi", color: "#8BC34A", bg: "#F1F8E9" };
    default:
      return { name: "devices", color: "#9E9E9E", bg: "#F5F5F5" };
  }
};

const getApplianceCardColor = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "electric fan":
      return "#E0F7FA"; // cyan
    case "air conditioner":
      return "#E3F2FD"; // light blue
    case "refrigerator":
      return "#e713a721"; // green
    case "washing machine":
      return "#F3E5F5"; // purple
    case "television":
      return "#FFF3E0"; // orange
    case "computer":
      return "#F1F8E9"; // light green
    case "router/wifi":
      return "#7bc9239d";
    default:
      return "#bfdf0f54"; // default gray
  }
};
type NavProp = NativeStackNavigationProp<RootStackParamList, "Recommendations">;

// ✅ Updated interface to match backend
interface Recommendation {
  appliance_name: string;
  appliance_type?: string;
  location?: string;
  total_kwh?: number;
  recommendations?: string[];
}

interface PerformanceSummary {
  checked_appliances: number;
  below_threshold: number;
  efficiency_score: number; // e.g. 75.0
  summary_message: string; // "⚖️ Moderate efficiency..."
  status: string;
}

const Recommendations = () => {
  const navigation = useNavigation<NavProp>();

  const [groupedRecommendations, setGroupedRecommendations] = useState<
    Record<string, Recommendation[]>
  >({});
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [savingsMode, setSavingsMode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredRecommendations, setFilteredRecommendations] = useState<
    Record<string, Recommendation[]>
  >({});
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "high" | "quick"
  >("all");
  const [applianceMonthlyDiscrepancies, setApplianceMonthlyDiscrepancies] =
    useState<
      Record<string, { current: number; previous: number; diffPercent: number }>
    >({});

  // ====== Helper Functions ======
  const filterRecommendations = (
    grouped: Record<string, Recommendation[]>,
    filter: "all" | "high" | "quick"
  ) => {
    if (filter === "all") return grouped;

    const filtered: Record<string, Recommendation[]> = {};

    Object.entries(grouped).forEach(([appliance, recs]) => {
      const include = recs.some((r) => {
        if (!r.recommendations) return false;

        return r.recommendations.some((msg) => {
          const lowerMsg = msg.toLowerCase();

          if (filter === "high") {
            return lowerMsg.includes("high amount of energy");
          } else if (filter === "quick") {
            return lowerMsg.includes("slightly more energy");
          }
          return false;
        });
      });

      if (include) filtered[appliance] = recs;
    });

    return filtered;
  };

  const fetchMonthlyDiscrepancies = async (
    household_id: string,
    appliancesList: any[]
  ) => {
    const results: Record<string, any> = {};

    for (const ap of appliancesList) {
      const deviceName = ap.device_id; // DEVICE ID is used in your endpoint
      const apiPath = `/energy/monthly/${deviceName}?household_id=${household_id}&limit=2`;

      try {
        const res = await api.get(apiPath);
        const months = res.data?.data || [];

        if (months.length < 2) continue; // Not enough data

        const prev = months[0].total_kwh;
        const curr = months[1].total_kwh;

        const diffPercent = prev !== 0 ? ((curr - prev) / prev) * 100 : 0;

        results[ap.appliance_name] = {
          previous: prev,
          current: curr,
          diffPercent,
        };
      } catch (err) {
        console.log(`❌ Error getting monthly for: ${deviceName}`, err);
      }
    }

    setApplianceMonthlyDiscrepancies(results);
  };

  // Effect
  useEffect(() => {
    const filtered = filterRecommendations(
      groupedRecommendations,
      selectedFilter
    );
    setFilteredRecommendations(filtered);
  }, [groupedRecommendations, selectedFilter]);

  //performance summary state
  const [performanceSummary, setPerformanceSummary] =
    useState<PerformanceSummary | null>(null);

  // 🆕 Weekly and Monthly Comparison States
  const [weeklyComparison, setWeeklyComparison] = useState<{
    current: number;
    previous: number;
    diffPercent: number;
  } | null>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<{
    current: number;
    previous: number;
    diffPercent: number;
  } | null>(null);

  // =============================
  // Fetch recommendations from API
  // =============================
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!storedUserData) {
          console.log("⚠️ No user data found in storage");
          return;
        }

        const parsedUser = JSON.parse(storedUserData);
        const household_id = parsedUser.household_id;
        if (!household_id) {
          console.log("⚠️ No household_id found in user data");
          return;
        }

        console.log("📦 Using household_id:", household_id);

        const response = await api.get(
          `/energy/recommendations/${household_id}`
        );
        console.log("✅ Fetched data:", response.data);

        const data = response.data;
        const recs: Recommendation[] = data.recommendations || [];

        // ✅ Group recommendations by appliance name
        const grouped = recs.reduce(
          (acc: Record<string, Recommendation[]>, rec) => {
            const key = rec.appliance_name || "Unknown Appliance";
            if (!acc[key]) acc[key] = [];
            acc[key].push(rec);
            return acc;
          },
          {}
        );

        // Fetch all registered appliances
        const apListRes = await api.get(
          `/appliances?household_id=${household_id}`
        );
        const appliancesList = apListRes.data.appliances || [];

        // Fetch appliance-level monthly discrepancies
        await fetchMonthlyDiscrepancies(household_id, appliancesList);

        console.log(
          "📊 Monthly appliance discrepancies:",
          applianceMonthlyDiscrepancies
        );

        setGroupedRecommendations(grouped);
        setSavingsMode(data.savings_mode || "");
        setSkippedCount(data.skipped_unregistered || 0);

        // NEW: set performance summary from backend response
        if (data.performance_summary) {
          setPerformanceSummary(data.performance_summary as PerformanceSummary);
        } else {
          setPerformanceSummary(null);
        }
        // 🆕 Fetch weekly and monthly totals
        const [weeklyRes, monthlyRes] = await Promise.all([
          api.get(`/energy/weekly/total?household_id=${household_id}&limit=2`),
          api.get(`/energy/monthly/total?household_id=${household_id}&limit=2`),
        ]);

        const weeklyData = weeklyRes.data;
        const monthlyData = monthlyRes.data;

        console.log("📊 Weekly data:", weeklyRes.data);
        console.log("📅 Monthly data:", monthlyRes.data);

        if (weeklyData.data?.length === 2) {
          const [prev, curr] = weeklyData.data;
          console.log("📆 Previous Week kWh:", prev.weekly_total_kwh);
          console.log("⚡ Current Week kWh:", curr.weekly_total_kwh);

          const diffPercent =
            ((curr.weekly_total_kwh - prev.weekly_total_kwh) /
              prev.weekly_total_kwh) *
            100;

          setWeeklyComparison({
            current: curr.weekly_total_kwh,
            previous: prev.weekly_total_kwh,
            diffPercent,
          });
        }
        if (monthlyData.data?.length === 2) {
          const [prev, curr] = monthlyData.data;
          console.log("📆 Previous Month kWh:", prev.monthly_total_kwh);
          console.log("⚡ Current Month kWh:", curr.monthly_total_kwh);

          const diffPercent =
            ((curr.monthly_total_kwh - prev.monthly_total_kwh) /
              prev.monthly_total_kwh) *
            100;
          setMonthlyComparison({
            current: curr.monthly_total_kwh,
            previous: prev.monthly_total_kwh,
            diffPercent,
          });
        }
      } catch (err: any) {
        console.log("❌ Error fetching recommendations:", err);
        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Failed to load recommendations.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // helper for color dot based on efficiency score
  const scoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return "#999";
    if (score >= 80) return "#2E7D32"; // green
    if (score >= 50) return "#F9A825"; // yellow
    return "#C62828"; // red
  };

  const getBackgroundColor = (status: string | undefined) => {
    switch (status) {
      case "good":
        return "#e0e6c8ff"; // light green
      case "moderate":
        return "#eeb517b4"; // soft yellow-orange
      case "high":
        return "#db0b2046"; // light red
      default:
        return "#FFFFFF"; // fallback
    }
  };

  const getTextColor = (status: string | undefined) => {
    switch (status) {
      case "good":
        return "#006400"; // dark green
      case "moderate":
        return "#8B8000"; // dark brownish yellow
      case "high":
        return "#4CAF50"; // neon green
      default:
        return "#000000"; // fallback (black)
    }
  };
  // =============================
  // Render
  // =============================
  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Energy-Saving Recommendations</Text>

      {/* LOADING / ERROR STATES */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#000000ff"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
          {error}
        </Text>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Savings Mode Info */}
          <Text
            style={{
              textAlign: "center",
              color: "#000000ff",
              marginTop: 5,
            }}
          >
            Savings Mode:{" "}
            <Text style={{ fontWeight: "bold", color: "red" }}>
              {savingsMode.toUpperCase()}
            </Text>
          </Text>

          {/* =========================
              USAGE / PERFORMANCE CARD
              (replaced static content with performance_summary)
          /* ========================= */}
          <View
            style={[
              styles.usageCard,
              {
                backgroundColor: getBackgroundColor(performanceSummary?.status),
              },
            ]}
          >
            <Icon name="eco" size={60} color="#4CAF50" />
            <View style={styles.usageTextContainer}>
              {performanceSummary ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.usageValue}>Performance</Text>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 6,
                        backgroundColor: scoreColor(
                          performanceSummary.efficiency_score
                        ),
                        marginLeft: 8,
                        marginTop: 6,
                      }}
                    />
                  </View>

                  <Text
                    style={[
                      styles.usageKwh,
                      { color: getTextColor(performanceSummary.status) },
                    ]}
                  >
                    {performanceSummary.efficiency_score.toFixed(0)}% Efficient
                  </Text>

                  <Text style={styles.usageNote}>
                    {performanceSummary.summary_message}
                  </Text>

                  <Text style={styles.belowThresholdText}>
                    {performanceSummary.below_threshold} of{" "}
                    {performanceSummary.checked_appliances} appliances are below
                    threshold
                  </Text>
                </>
              ) : (
                <ActivityIndicator size="small" color="#000" />
              )}
            </View>
          </View>
          {/* 🆕 Weekly & Monthly Comparison Section */}
          <View style={{ marginTop: 20 }}>
            <Text style={styles.reportText}>Energy Consumption Analysis</Text>
            <EnergyAnalysis
              weeklyComparison={weeklyComparison}
              monthlyComparison={monthlyComparison}
              applianceMonthlyDiscrepancies={applianceMonthlyDiscrepancies}
            />
          </View>

          <Text
            style={{
              fontWeight: "bold",
              color: "#000000ff",
              fontSize: 18,
              marginVertical: 20,
              textAlign: "left",
            }}
          >
            Strategies
          </Text>

          {/* Skipped Info */}
          {skippedCount > 0 && (
            <Text
              style={{ textAlign: "center", color: "#999", marginBottom: 10 }}
            >
              ⚠️ Skipped {skippedCount} unregistered appliance
              {skippedCount > 1 ? "s" : ""}.
            </Text>
          )}

          <View style={styles.filterButtonContainer}>
            {[
              { label: "All", value: "all" },
              { label: "High Impact", value: "high" },
              { label: "Quick Change", value: "quick" },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.value}
                onPress={() =>
                  setSelectedFilter(filter.value as "all" | "high" | "quick")
                }
                style={{
                  backgroundColor:
                    selectedFilter === filter.value ? "#FFD700" : "#E0E0E0",
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  marginHorizontal: 5,
                }}
              >
                <Text
                  style={{
                    color: selectedFilter === filter.value ? "#000" : "#000",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recommendations */}
          {Object.keys(filteredRecommendations).length === 0 ? (
            <Text
              style={{
                color: "#888",
                textAlign: "center",
                fontSize: 16,
                marginTop: 30,
                marginBottom: 80,
              }}
            >
              No recommendations available for today.
            </Text>
          ) : (
            Object.entries(filteredRecommendations).map(([appliance, recs]) => (
              <View
                key={appliance}
                style={[
                  styles.applianceCard,
                  {
                    backgroundColor: getApplianceCardColor(
                      recs[0]?.appliance_type
                    ),
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardContainer}>
                  <View style={styles.cardHeader}>
                    {(() => {
                      const icon = getApplianceIcon(recs[0]?.appliance_type);
                      return (
                        <View
                          style={{
                            width: 45,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: icon.bg,
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 10,
                          }}
                        >
                          <Icon name={icon.name} size={25} color={icon.color} />
                        </View>
                      );
                    })()}
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.applianceTitle}>{appliance}</Text>
                    {/* Location */}
                    {recs[0]?.location && (
                      <Text style={styles.applianceLocation}>
                        {recs[0].location}
                      </Text>
                    )}
                    {/* Messages */}
                  </View>
                </View>
                {recs.flatMap((r, idx) =>
                  r.recommendations && r.recommendations.length > 0 ? (
                    r.recommendations.map((msg, i) => (
                      <View key={`${idx}-${i}`} style={styles.recommendItem}>
                        <Icon
                          name="lightbulb-outline"
                          size={25}
                          color="#FFD700"
                          style={{ marginLeft: 20 }}
                        />
                        <Text style={styles.recommendDesc}>{msg}</Text>
                      </View>
                    ))
                  ) : (
                    <Text key={`no-msg-${idx}`} style={styles.recommendDesc}>
                      No recommendations available.
                    </Text>
                  )
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <SafeAreaView style={styles.bottomNavContainer} edges={["bottom"]}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("MainMenu")}
          >
            <Icon name="home" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("ConsumptionPage")}
          >
            <Icon name="description" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.fab}>
            <Icon name="add" size={30} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("Bills")}
          >
            <Icon name="attach-money" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("Recommendations")}
          >
            <Icon name="flash-on" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default Recommendations;
