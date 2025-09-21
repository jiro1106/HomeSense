// MainMenu.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { styles } from "./styles/MainMenuStyles";
import RegisterAppliancePage from "./RegisterAppliancePage";
import Recommendations from "./Recommendations";
import Bills from "./Bills";
import ConsumptionPage from "./ConsumptionPage"; // ✅ import ConsumptionPage

type MainMenuNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "MainMenu"
>;

const MainMenu = () => {
  const navigation = useNavigation<MainMenuNavProp>();
  const [activeTab, setActiveTab] = useState<
    "home" | "consumption" | "register" | "recommendations" | "bills"
  >("home");

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userData");
    navigation.replace("Login");
  };

  const UsageCard = ({
    icon,
    value,
    label,
  }: {
    icon: string;
    value: string;
    label: string;
  }) => (
    <View style={styles.usageCard}>
      <Icon name={icon} size={24} color="#000" style={styles.cardIcon} />
      <Text style={styles.usageValue}>{value}</Text>
      <Text style={styles.usageLabel}>{label}</Text>
    </View>
  );

  const DeviceItem = ({
    icon,
    name,
    consumption,
    color,
  }: {
    icon: string;
    name: string;
    consumption: string;
    color: string;
  }) => (
    <View style={styles.deviceItem}>
      <View style={[styles.deviceIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.deviceName}>{name}</Text>
      <Text style={styles.deviceConsumption}>{consumption}</Text>
    </View>
  );

  const renderHomeContent = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Home</Text>

      <Text style={styles.sectionLabel}>Usage Summary</Text>
      <View style={styles.usageContainer}>
        <UsageCard icon="flash-on" value="9.5 kWh" label="Today" />
        <UsageCard icon="refresh" value="72 kWh" label="This Week" />
        <UsageCard icon="event" value="480 kWh" label="This Month" />
      </View>

      <View style={styles.billCard}>
        <Text style={styles.billTitle}>Estimated Bill for this Month</Text>
        <Text style={styles.billAmount}>₱2,413.73</Text>
        <Text style={styles.billLabel}>Monthly Bill</Text>
      </View>

      <Text style={styles.sectionLabel}>Top Energy Consuming Devices</Text>
      <View style={styles.devicesContainer}>
        <DeviceItem
          icon="ac-unit"
          name="Air Conditioner"
          consumption="20.3 kWh"
          color="#87CEEB"
        />
        <DeviceItem
          icon="kitchen"
          name="Refrigerator"
          consumption="10.5 kWh"
          color="#FFA500"
        />
        <DeviceItem
          icon="tv"
          name="Television"
          consumption="7.1 kWh"
          color="#FFD700"
        />
      </View>

      <Text style={styles.sectionLabel}>Energy Saving Recommendation</Text>
      <View style={styles.recommendationCard}>
        <Icon name="eco" size={32} color="#4CAF50" />
        <Text style={styles.recommendationText}>
          Consider using energy-efficient appliances to reduce your electricity
          consumption
        </Text>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return renderHomeContent();
      case "consumption":
        return <ConsumptionPage />; // ✅ consumption page
      case "register":
        return (
          <RegisterAppliancePage
            navigation={navigation}
            onSuccess={() => setActiveTab("home")}
          />
        );
      case "recommendations":
        return <Recommendations />;
      case "bills":
        return <Bills />;
      default:
        return renderHomeContent();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Global Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoTextRow}>
              <Text style={styles.logoTextH}>H</Text>
              <Image
                source={require("../assets/homesenseLogo.png")}
                style={styles.logoIcon}
              />
              <Text style={styles.logoText}>meSense</Text>
            </View>

            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => navigation.replace("SettingsPage")}
              >
                <Icon name="settings" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <SafeAreaView style={styles.bottomNavContainer} edges={["bottom"]}>
        <View style={styles.bottomNav}>
          {/* Home */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab("home")}
          >
            <Icon
              name="home"
              size={24}
              color={activeTab === "home" ? "#FFD600" : "#fff"}
            />
          </TouchableOpacity>

          {/* Consumption */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab("consumption")}
          >
            <Icon
              name="description"
              size={24}
              color={activeTab === "consumption" ? "#FFD600" : "#fff"}
            />
          </TouchableOpacity>

          {/* Register (FAB) */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setActiveTab("register")}
          >
            <Icon name="add" size={30} color="#000" />
          </TouchableOpacity>

          {/* Bills */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab("bills")}
          >
            <Icon
              name="attach-money"
              size={24}
              color={activeTab === "bills" ? "#FFD600" : "#fff"}
            />
          </TouchableOpacity>

          {/* Recommendations */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab("recommendations")}
          >
            <Icon
              name="flash-on"
              size={24}
              color={activeTab === "recommendations" ? "#FFD600" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default MainMenu;
