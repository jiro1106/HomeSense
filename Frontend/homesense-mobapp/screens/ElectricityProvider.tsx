import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import styles from "./styles/ElectricityProviderStyles";
import api from "../utils/api";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ElectricityProvider"
>;

const ElectricityProvider = () => {
  const navigation = useNavigation<NavProp>();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // 🧠 Load provider from backend or local storage
  useEffect(() => {
    const loadProvider = async () => {
      try {
        // Step 1: Get current user
        const storedUser = await AsyncStorage.getItem("userData");
        if (!storedUser) return;

        const parsedUser = JSON.parse(storedUser);
        const householdId = parsedUser.household_id;
        if (!householdId) return;

        // ✅ Fetch current provider from backend
        const response = await api.get(
          `energy/household/${householdId}/provider`
        );
        const provider = response.data?.provider;

        if (provider) {
          setSelectedProvider(provider);
          await AsyncStorage.setItem("electricityProvider", provider);
        }
      } catch (error: any) {
        console.warn("Error fetching provider:", error.message);
        // fallback to locally saved provider
        const savedProvider = await AsyncStorage.getItem("electricityProvider");
        if (savedProvider) setSelectedProvider(savedProvider);
      } finally {
        setLoading(false);
      }
    };

    loadProvider();
  }, []);

  // ⚙️ Handle provider selection
  const handleSelectProvider = async (provider: string) => {
    try {
      setUpdating(true);
      setSelectedProvider(provider);
      await AsyncStorage.setItem("electricityProvider", provider);

      const storedUser = await AsyncStorage.getItem("userData");
      if (!storedUser) {
        Alert.alert("Saved Locally", `You selected ${provider}.`);
        navigation.goBack();
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const householdId = parsedUser.household_id;
      if (!householdId) {
        Alert.alert("Saved Locally", `You selected ${provider}.`);
        navigation.goBack();
        return;
      }

      // ✅ Update provider on backend
      const response = await api.put(
        `energy/household/${householdId}/provider`,
        null,
        {
          params: { provider },
        }
      );

      Alert.alert(
        "Saved",
        response.data?.message || "Electricity provider updated successfully!"
      );
    } catch (error: any) {
      console.warn("Error updating provider:", error.message);
      Alert.alert("Error", "Failed to save provider. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // 🌀 Loading state (when fetching from backend)
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ marginTop: 10 }}>Loading electricity provider...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000ff" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Electricity Provider</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.instructions}>
          Please select your electricity provider. This will help the system use
          the correct billing rates and data for more accurate monitoring and
          recommendations.
        </Text>

        {/* BATELec Option */}
        <TouchableOpacity
          disabled={updating}
          style={[
            styles.optionButton,
            selectedProvider === "BATELEC" && styles.selectedOption,
            updating && { opacity: 0.5 },
          ]}
          onPress={() => handleSelectProvider("BATELEC")}
        >
          <View style={styles.optionContent}>
            <Image
              source={require("../assets/batelec-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>BATELEC</Text>
          </View>
        </TouchableOpacity>

        {/* MERALCO Option */}
        <TouchableOpacity
          disabled={updating}
          style={[
            styles.optionButton,
            selectedProvider === "MERALCO" && styles.selectedOption,
            updating && { opacity: 0.5 },
          ]}
          onPress={() => handleSelectProvider("MERALCO")}
        >
          <View style={styles.optionContent}>
            <Image
              source={require("../assets/meralco-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>MERALCO</Text>
          </View>
        </TouchableOpacity>

        {/* 🌀 Show small spinner during update */}
        {updating && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={{ marginTop: 5 }}>Saving selection...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ElectricityProvider;
