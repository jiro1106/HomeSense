import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import styles from "./styles/ElectricityProviderStyles";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ElectricityProvider"
>;

const ElectricityProvider = () => {
  const navigation = useNavigation<NavProp>();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => {
    const loadProvider = async () => {
      const savedProvider = await AsyncStorage.getItem("electricityProvider");
      if (savedProvider) setSelectedProvider(savedProvider);
    };
    loadProvider();
  }, []);

  const handleSelectProvider = async (provider: string) => {
    setSelectedProvider(provider);
    await AsyncStorage.setItem("electricityProvider", provider);
    Alert.alert(
      "Saved",
      `You selected ${provider} as your electricity provider.`
    );
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000ff" />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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

        <ScrollView contentContainerStyle={styles.content}>
          {/* Instruction */}
          <Text style={styles.instructions}>
            Please select your electricity provider. This will help the system
            use the correct billing rates and data for more accurate monitoring
            and recommendations.
          </Text>

          {/* BATELec Option */}
          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedProvider === "BATELEC" && styles.selectedOption,
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
            style={[
              styles.optionButton,
              selectedProvider === "MERALCO" && styles.selectedOption,
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default ElectricityProvider;
