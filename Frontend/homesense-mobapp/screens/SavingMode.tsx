import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import api from "../utils/api";
import styles from "./styles/SavingModeStyles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "SavingMode">;

const SavingMode = () => {
  const navigation = useNavigation<NavProp>();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    const loadHouseholdId = async () => {
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setHouseholdId(parsedUser.household_id); // 👈 get it from backend data
      }
    };
    loadHouseholdId();
  }, []);

  // Ensure no default is shown when returning to this screen unless explicitly set
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const syncFromExplicit = async () => {
        try {
          const storedUser = await AsyncStorage.getItem("userData");
          if (!storedUser) return;
          const parsedUser = JSON.parse(storedUser);
          const hhId = parsedUser?.household_id;
          if (!hhId) return;
          const storageKey = `savingMode:${hhId}`;
          const explicitKey = `savingModeExplicit:${hhId}`;
          const wasExplicit = await AsyncStorage.getItem(explicitKey);
          if (cancelled) return;
          if (wasExplicit === "true") {
            const savedMode = await AsyncStorage.getItem(storageKey);
            if (savedMode) {
              const formattedMode =
                savedMode.charAt(0).toUpperCase() +
                savedMode.slice(1).toLowerCase();
              if (!cancelled) setSelectedMode(formattedMode);
            }
          } else {
            if (!cancelled) setSelectedMode(null);
          }
        } catch (error) {
          console.warn("Error syncing saving mode:", error);
        }
      };
      syncFromExplicit();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Load saved mode from AsyncStorage
  useEffect(() => {
    const fetchSavingMode = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (!storedUser) return;
        const parsedUser = JSON.parse(storedUser);
        const hhId = parsedUser.household_id;
        if (!hhId) return;

        // Fetch mode from backend
        const response = await api.get(`energy/household/${hhId}/mode`);
        let backendMode = response.data.mode; // "low", "medium", or "high"

        // Format mode for display
        backendMode =
          backendMode.charAt(0).toUpperCase() +
          backendMode.slice(1).toLowerCase();

        // Check if user explicitly chose a mode before
        const explicitKey = `savingModeExplicit:${hhId}`;
        const wasExplicit = await AsyncStorage.getItem(explicitKey);

        if (wasExplicit === "true") {
          // If explicit, use AsyncStorage mode
          const storageKey = `savingMode:${hhId}`;
          const savedMode = await AsyncStorage.getItem(storageKey);
          if (savedMode) {
            const formattedMode =
              savedMode.charAt(0).toUpperCase() +
              savedMode.slice(1).toLowerCase();
            setSelectedMode(formattedMode);
            return;
          }
        }

        // Otherwise, default to backend mode
        setSelectedMode(backendMode);
      } catch (error) {
        console.warn("Error fetching saving mode:", error);
        setSelectedMode(null);
      }
    };

    fetchSavingMode();
  }, []);

  // Handle user selecting a mode
  const handleSelectMode = async (mode: string) => {
    try {
      setLoading(true);
      setSelectedMode(mode);
      let storageKey: string | null = null;
      if (householdId) {
        storageKey = `savingMode:${householdId}`;
      } else {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.household_id) {
            storageKey = `savingMode:${parsedUser.household_id}`;
          }
        }
      }
      if (storageKey) {
        await AsyncStorage.setItem(storageKey, mode.toLowerCase());
        const explicitKey = storageKey.replace(
          "savingMode:",
          "savingModeExplicit:"
        );
        await AsyncStorage.setItem(explicitKey, "true");
      }

      // Convert to lowercase for backend
      const backendMode = mode.toLowerCase();

      // Send PUT request to API
      if (householdId) {
        const response = await api.put(
          `energy/household/${householdId}/mode`,
          null,
          {
            params: { mode: backendMode },
          }
        );

        Alert.alert("Success", response.data.message);
      } else {
        Alert.alert("Saved", "Mode saved locally.");
      }
      // navigation.goBack();
    } catch (error: any) {
      console.warn("Error updating savings mode:", error);
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "Failed to update mode. Check your connection or API server."
      );
    } finally {
      setLoading(false);
    }
  };

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
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savings Mode</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={{ marginTop: 10 }}>Updating mode...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Instructions */}
          <View style={styles.iconContainer}>
            <Icon
              name="bolt"
              size={60}
              color="#040a04ff"
              style={styles.ecoIcon}
            />
          </View>
          <Text style={styles.chooseMode}>Choose Your Savings Mode</Text>
          <Text style={styles.instructions}>
            Choose how helpful HomeSense should be, stricter modes help you save
            more, while relaxed modes keep things comfy
          </Text>
          <Text style={styles.modeTitle}>Modes:</Text>
          {/* Options */}
          {[
            {
              mode: "Strict",
              icon: "speed",
              color: "#F44336",
              desc: "Strict mode — frequent and detailed tips for small increases in usage.",
            },
            {
              mode: "Balanced",
              icon: "tune",
              color: "#FFC107",
              desc: "Balanced mode — helpful tips when usage rises noticeably.",
            },
            {
              mode: "Relaxed",
              icon: "eco",
              color: "#4CAF50",
              desc: "Relaxed mode — suggests changes only for big or unusual spikes.",
            },
          ].map(({ mode, icon, color, desc }) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.optionButton,
                selectedMode === mode && styles.selectedOption,
              ]}
              onPress={() => handleSelectMode(mode)}
            >
              <View style={styles.optionRow}>
                <View style={styles.optionIconContainer}>
                  <Icon name={icon} size={36} color={color} />
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.optionTitle}>{mode} Mode</Text>
                  <Text style={styles.optionDesc}>{desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default SavingMode;
