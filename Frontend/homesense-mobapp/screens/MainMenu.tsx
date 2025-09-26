// MainMenu.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
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
import ConsumptionPage from "./ConsumptionPage";
import api from "../utils/api"; // ✅ axios instance

type MainMenuNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "MainMenu"
>;

const MainMenu = () => {
  const navigation = useNavigation<MainMenuNavProp>();
  const [activeTab, setActiveTab] = useState<
    "home" | "consumption" | "register" | "recommendations" | "bills"
  >("home");

  // =========================
  // Usage Summary state
  // =========================
  const [todayUsage, setTodayUsage] = useState<string | null>(null);
  const [weekUsage, setWeekUsage] = useState<string | null>(null);
  const [monthUsage, setMonthUsage] = useState<string | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ reusable fetch function
  const fetchUsageSummary = useCallback(async () => {
    try {
      setLoadingUsage(true);

      const [todayRes, weekRes, monthRes] = await Promise.all([
        api.get("/energy/daily/total"),
        api.get("energy/weekly/total?limit=1"),
        api.get("/energy/monthly/total"),
      ]);

      const safeFormat = (val: any) => {
        if (typeof val === "number") return val.toFixed(2) + " kWh";
        if (typeof val === "string") return val;
        return "0.00 kWh";
      };

      // ✅ today comes as single number
      setTodayUsage(safeFormat(todayRes.data?.total_kwh));

      // ✅ weekly → get last item from data array
      if (Array.isArray(weekRes.data?.data) && weekRes.data.data.length > 0) {
        const lastWeek =
          weekRes.data.data[weekRes.data.data.length - 1].weekly_total_kwh;
        setWeekUsage(safeFormat(lastWeek));
      } else {
        setWeekUsage("0.00 kWh");
      }

      // ✅ monthly → get last item from data array
      if (Array.isArray(monthRes.data?.data) && monthRes.data.data.length > 0) {
        const lastMonth =
          monthRes.data.data[monthRes.data.data.length - 1]
            .monthly_total_kwh;
        setMonthUsage(safeFormat(lastMonth));
      } else {
        setMonthUsage("0.00 kWh");
      }
    } catch (error) {
      console.error("Error fetching usage summary:", error);
      setTodayUsage("Error");
      setWeekUsage("Error");
      setMonthUsage("Error");
    } finally {
      setLoadingUsage(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsageSummary();
  }, [fetchUsageSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsageSummary();
  }, [fetchUsageSummary]);

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
    value: string | null;
    label: string;
  }) => (
    <View style={styles.usageCard}>
      <Icon name={icon} size={24} color="#000" style={styles.cardIcon} />
      {loadingUsage ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text style={styles.usageValue}>{value ?? "--"}</Text>
      )}
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
    <ScrollView
      style={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.pageTitle}>Home</Text>

      <Text style={styles.sectionLabel}>Usage Summary</Text>
      <View style={styles.usageContainer}>
        <UsageCard icon="flash-on" value={todayUsage} label="Today" />
        <UsageCard icon="refresh" value={weekUsage} label="This Week" />
        <UsageCard icon="event" value={monthUsage} label="This Month" />
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
        return <ConsumptionPage />;
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
