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
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Text style={styles.pageTitle}>Energy-Saving Recommendations</Text>

      {/* LOADING / ERROR STATES */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4CAF50"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
          {error}
        </Text>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

          <Text
            style={{
              fontWeight: 500,
              color: "#999",
              fontSize: 20,
              marginVertical: 10,
            }}
          >
            Recommendations
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

          {/* Recommendations */}
          {Object.keys(groupedRecommendations).length === 0 ? (
            <Text style={{ color: "#888", textAlign: "center", marginTop: 30 }}>
              No recommendations available for today.
            </Text>
          ) : (
            Object.entries(groupedRecommendations).map(([appliance, recs]) => (
              <View key={appliance} style={styles.applianceCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <Icon name="devices" size={22} color="#000000ff" />
                  <Text style={styles.applianceTitle}>{appliance}</Text>
                </View>

                {/* Location */}
                {recs[0]?.location && (
                  <Text style={styles.applianceLocation}>
                    📍 {recs[0].location}
                  </Text>
                )}

                {/* Messages */}
                {recs.flatMap((r, idx) =>
                  r.recommendations && r.recommendations.length > 0 ? (
                    r.recommendations.map((msg, i) => (
                      <View key={`${idx}-${i}`} style={styles.recommendItem}>
                        <Icon
                          name="lightbulb-outline"
                          size={18}
                          color="#FFD700"
                          style={{ marginRight: 6 }}
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
