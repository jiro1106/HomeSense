import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import api from "../utils/api";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { styles } from "../screens/styles/RecoSummary";

interface PerformanceSummary {
  checked_appliances: number;
  below_threshold: number;
  efficiency_score: number;
  summary_message: string;
  status: string;
}

const RecoSummary = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [performanceSummary, setPerformanceSummary] =
    useState<PerformanceSummary | null>(null);
  const [savingsMode, setSavingsMode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!storedUserData) return;

        const parsedUser = JSON.parse(storedUserData);
        const household_id = parsedUser.household_id;
        if (!household_id) return;

        const response = await api.get(
          `/energy/recommendations/${household_id}`
        );
        const data = response.data;

        if (data.performance_summary) {
          setPerformanceSummary(data.performance_summary);
        }
        setSavingsMode(data.savings_mode || "");
      } catch (error) {
        console.error("⚠️ Error fetching energy summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBackgroundColor = (status: string | undefined) => {
    switch (status) {
      case "good":
        return "#E0F2F1";
      case "moderate":
        return "#FFF8E1";
      case "high":
        return "#FFEBEE";
      default:
        return "#F9FAFB";
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(performanceSummary?.status) },
      ]}
    >
      <View style={styles.summaryContainer}>
        <Icon name="eco" size={35} color="#4CAF50" style={styles.icon} />
        <Text style={styles.header}>Energy Summary</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : performanceSummary ? (
        <>
          <Text style={styles.text}>
            • {performanceSummary.below_threshold} of{" "}
            {performanceSummary.checked_appliances} appliances are below
            threshold
          </Text>

          <Text style={styles.text}>
            • Savings Mode:{" "}
            <Text
              style={[
                styles.savingsText,
                savingsMode.toLowerCase() === "high"
                  ? styles.high
                  : savingsMode.toLowerCase() === "medium"
                  ? styles.medium
                  : styles.low,
              ]}
            >
              {savingsMode.toUpperCase()}
            </Text>
          </Text>
        </>
      ) : (
        <Text style={styles.noData}>No data available</Text>
      )}
    </View>
  );
};

export default RecoSummary;
