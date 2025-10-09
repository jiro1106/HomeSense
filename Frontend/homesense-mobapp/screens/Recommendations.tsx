import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { styles } from "./styles/RecoStyles";
import api from "../utils/api";

const getApplianceIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "air conditioner":
      return { name: "ac-unit", color: "#03A9F4", bg: "#E1F5FE" };
    case "electric fan":
      return { name: "toys", color: "#00BCD4", bg: "#E0F7FA" };
    case "refrigerator":
      return { name: "kitchen", color: "#4CAF50", bg: "#E8F5E9" };
    case "washing machine":
      return { name: "local-laundry-service", color: "#9C27B0", bg: "#F3E5F5" };
    case "television":
      return { name: "tv", color: "#FF9800", bg: "#FFF3E0" };
    case "microwave":
      return { name: "microwave", color: "#E91E63", bg: "#FCE4EC" };
    case "toaster":
      return { name: "restaurant", color: "#FF5722", bg: "#FBE9E7" };
    case "coffee maker":
      return { name: "coffee-maker", color: "#795548", bg: "#EFEBE9" };
    case "blender":
      return { name: "blender", color: "#8BC34A", bg: "#F1F8E9" };
    default:
      return { name: "devices", color: "#9E9E9E", bg: "#F5F5F5" };
  }
};

const getApplianceCardColor = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "air conditioner":
      return "#E3F2FD"; // light blue
    case "electric fan":
      return "#E0F7FA"; // cyan
    case "refrigerator":
      return "#0c29cc46"; // green
    case "washing machine":
      return "#F3E5F5"; // purple
    case "television":
      return "#FFF3E0"; // orange
    case "microwave":
      return "#FCE4EC"; // pink
    case "toaster":
      return "#FBE9E7"; // red-orange
    case "coffee maker":
      return "#EFEBE9"; // brown
    case "blender":
      return "#F1F8E9"; // light green
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

const Recommendations = () => {
  const navigation = useNavigation<NavProp>();

  const [groupedRecommendations, setGroupedRecommendations] = useState<
    Record<string, Recommendation[]>
  >({});
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [savingsMode, setSavingsMode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "high" | "quick"
  >("all");
  // =============================
  // Fetch recommendations from API
  // =============================
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const household_id = "household1"; // 🔧 make dynamic later
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

        setGroupedRecommendations(grouped);
        setSavingsMode(data.savings_mode || "");
        setSkippedCount(data.skipped_unregistered || 0);
      } catch (err: any) {
        console.error("❌ Error fetching recommendations:", err);
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
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Savings Mode Info */}
          <Text
            style={{
              textAlign: "center",
              color: "#000000ff",
              marginBottom: 10,
            }}
          >
            Savings Mode:{" "}
            <Text style={{ fontWeight: "bold", color: "red" }}>
              {savingsMode.toUpperCase()}
            </Text>
          </Text>
          <View style={styles.usageCard}>
            <Icon name="eco" size={60} color="#4CAF50" />
            <View style={styles.usageTextContainer}>
              <Text style={styles.usageValue}>This Week’s Usage</Text>
              <Text style={styles.usageKwh}>54.6 kWh</Text>
              <Text style={styles.usageNote}>
                You saved 12% more energy this week!
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontWeight: 500,
              color: "#999",
              fontSize: 20,
              marginVertical: 10,
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
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Recommendations */}
          {Object.keys(groupedRecommendations).length === 0 ? (
            <Text style={{ color: "#888", textAlign: "center", marginTop: 30 }}>
              No recommendations available for today.
            </Text>
          ) : (
            Object.entries(groupedRecommendations).map(([appliance, recs]) => (
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
