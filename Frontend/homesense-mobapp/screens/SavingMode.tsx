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
import { useNavigation } from "@react-navigation/native";
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

  // Load saved mode from AsyncStorage
  useEffect(() => {
    const loadMode = async () => {
      const savedMode = await AsyncStorage.getItem("savingMode");
      if (savedMode) setSelectedMode(savedMode);
    };
    loadMode();
  }, []);

  // Handle user selecting a mode
  const handleSelectMode = async (mode: string) => {
    try {
      setLoading(true);
      setSelectedMode(mode);
      await AsyncStorage.setItem("savingMode", mode);

      // Convert to lowercase for backend
      const backendMode = mode.toLowerCase();

      // Send PUT request to API
      const response = await api.put(
        `energy/household/${householdId}/mode`,
        null,
        {
          params: { mode: backendMode },
        }
      );

      Alert.alert("Success", response.data.message);
      navigation.goBack();
    } catch (error: any) {
      console.error("Error updating savings mode:", error);
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saving Mode</Text>
        </View>

        {loading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop: 10 }}>Updating mode...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Instructions */}
            <Text style={styles.instructions}>
              Choose how strict the system should be when suggesting
              energy-saving recommendations.
            </Text>

            {/* Options */}
            {["Low", "Medium", "High"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.optionButton,
                  selectedMode === mode && styles.selectedOption,
                ]}
                onPress={() => handleSelectMode(mode)}
              >
                <Text style={styles.optionText}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

export default SavingMode;
