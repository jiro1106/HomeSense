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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { styles } from "./styles/MainMenuStyles";
import RegisterAppliancePage from "./RegisterAppliancePage";
import Recommendations from "./Recommendations";
import Bills from "./Bills";
import ConsumptionPage from "./ConsumptionPage";
import api from "../utils/api";
import RecoSummary from "./RecoSummary";

type MainMenuNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "MainMenu"
>;

interface TopDevice {
  device_id: string;
  device_name: string;
  appliance_name: string;
  appliance_type: string;
  total_kwh: number;
}

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

  // =========================
  // Bill Estimation state
  // =========================
  const [monthlyBill, setMonthlyBill] = useState<string | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billTimestamp, setBillTimestamp] = useState<string | null>(null);

  // =========================
  // Top Devices state
  // =========================
  const [topDevices, setTopDevices] = useState<TopDevice[]>([]);
  const [loadingTopDevices, setLoadingTopDevices] = useState(true);
  const [hasRegisteredAppliances, setHasRegisteredAppliances] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // =========================
  // Fetch registered appliances
  // =========================
  const fetchRegisteredAppliances = useCallback(async (): Promise<any[]> => {
    try {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return [];
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;

      const response = await api.get(
        `/appliances?household_id=${household_id}`
      );
      return response.data.appliances || [];
    } catch (error) {
      console.warn("Error fetching registered appliances:", error);
      return [];
    }
  }, []);

  // =========================
  // Fetch monthly consumption for all devices
  // =========================
  const fetchMonthlyConsumptionForDevices = useCallback(
    async (devices: any[]): Promise<TopDevice[]> => {
      try {
        // Fetch consumption for each device in parallel
        const consumptionPromises = devices.map(async (device) => {
          try {
            const storedUserData = await AsyncStorage.getItem("userData");
            if (!storedUserData) return undefined; // Explicitly return undefined

            const parsedUser = JSON.parse(storedUserData);
            const household_id = parsedUser.household_id;
            console.log("Household logged in,", household_id);

            const response = await api.get(
              `/energy/monthly/recent/${device.device_id}?household_id=${household_id}`
            );
            const consumptionData = response.data;

            return {
              device_id: device.device_id,
              device_name: device.device_id,
              appliance_name: device.appliance_name || device.device_id,
              appliance_type: device.appliance_type || "Unknown",
              total_kwh: consumptionData.total_kwh || 0,
            } as TopDevice;
          } catch (error) {
            console.log(
              `Error fetching consumption for ${device.device_id}:`,
              error
            );
            return {
              device_id: device.device_id,
              device_name: device.device_id,
              appliance_name: device.appliance_name || device.device_id,
              appliance_type: device.appliance_type || "Unknown",
              total_kwh: 0,
            } as TopDevice;
          }
        });

        const results = await Promise.all(consumptionPromises);

        // ✅ Filter out undefined safely
        const validResults = results.filter(
          (device): device is TopDevice => device !== undefined
        );

        // Filter out devices with 0 consumption and sort by consumption (descending)
        return validResults
          .filter((device) => device.total_kwh > 0)
          .sort((a, b) => b.total_kwh - a.total_kwh)
          .slice(0, 3); // Get top 3 devices
      } catch (error) {
        console.warn("Error fetching device consumptions:", error);
        return [];
      }
    },
    []
  );

  // =========================
  // Fetch top energy consuming devices
  // =========================
  const fetchTopEnergyDevices = useCallback(async () => {
    try {
      setLoadingTopDevices(true);

      // First, get registered appliances
      const registeredAppliances = await fetchRegisteredAppliances();

      if (registeredAppliances.length === 0) {
        setHasRegisteredAppliances(false);
        setTopDevices([]);
        return;
      }

      setHasRegisteredAppliances(true);

      // Then fetch consumption data for all registered appliances
      const topDevicesData = await fetchMonthlyConsumptionForDevices(
        registeredAppliances
      );
      setTopDevices(topDevicesData);
    } catch (error) {
      console.warn("Error fetching top energy devices:", error);
      setTopDevices([]);
      setHasRegisteredAppliances(false);
    } finally {
      setLoadingTopDevices(false);
    }
  }, [fetchRegisteredAppliances, fetchMonthlyConsumptionForDevices]);

  // =========================
  // Reusable fetch function for usage summary
  // =========================
  const fetchUsageSummary = useCallback(async () => {
    try {
      setLoadingUsage(true);

      // Get household_id of logged-in user
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return;
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;
      console.log("Household logged in,", household_id);

      const [todayRes, weekRes, monthRes] = await Promise.all([
        api.get(`/energy/daily/total?household_id=${household_id}`),
        api.get(`energy/weekly/total?household_id=${household_id}&limit=1`),
        api.get(`/energy/monthly/total?household_id=${household_id}`),
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
          monthRes.data.data[monthRes.data.data.length - 1].monthly_total_kwh;
        setMonthUsage(safeFormat(lastMonth));
      } else {
        setMonthUsage("0.00 kWh");
      }
    } catch (error) {
      console.warn("Error fetching usage summary:", error);
      setTodayUsage("Error");
      setWeekUsage("Error");
      setMonthUsage("Error");
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  // =========================
  // =========================
  // Load bill estimation data
  // =========================
  const loadBillData = useCallback(async () => {
    try {
      setBillLoading(true);
      const billData = await AsyncStorage.getItem("monthlyBillData");
      if (billData) {
        const parsed = JSON.parse(billData);
        setMonthlyBill(
          parsed.totalBill ? `₱${parsed.totalBill.toFixed(2)}` : null
        );
        setBillTimestamp(parsed.timestamp || null);
      } else {
        setMonthlyBill(null);
        setBillTimestamp(null);
      }
    } catch (error) {
      console.warn("Error loading bill data:", error);
      setMonthlyBill(null);
    } finally {
      setBillLoading(false);
    }
  }, []);

  // Combined refresh function
  // =========================
  const refreshAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchUsageSummary(),
        fetchTopEnergyDevices(),
        loadBillData(),
      ]);
    } catch (error) {
      console.warn("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsageSummary, fetchTopEnergyDevices, loadBillData]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Periodic check for bill updates while MainMenu is active
  useEffect(() => {
    const checkForBillUpdates = async () => {
      try {
        const refreshNeeded = await AsyncStorage.getItem(
          "mainMenuRefreshNeeded"
        );
        if (refreshNeeded === "true") {
          console.log("🔄 Periodic check: Bill data updated, refreshing...");
          await loadBillData();
          await AsyncStorage.removeItem("mainMenuRefreshNeeded");
        }
      } catch (error) {
        console.warn("Error in periodic bill update check:", error);
      }
    };

    // Check every 2 seconds for bill updates
    const interval = setInterval(checkForBillUpdates, 2000);

    return () => clearInterval(interval);
  }, [loadBillData]);

  // Reload bill data when returning to MainMenu and check for updates
  useFocusEffect(
    useCallback(() => {
      const checkAndLoadBillData = async () => {
        try {
          // Check if MainMenu refresh is needed
          const refreshNeeded = await AsyncStorage.getItem(
            "mainMenuRefreshNeeded"
          );
          if (refreshNeeded === "true") {
            console.log("🔄 MainMenu refresh needed, loading bill data...");
            await loadBillData();
            // Clear the refresh flag
            await AsyncStorage.removeItem("mainMenuRefreshNeeded");
          } else {
            // Normal load
            await loadBillData();
          }
        } catch (error) {
          console.warn("Error checking for bill updates:", error);
        }
      };

      checkAndLoadBillData();
    }, [loadBillData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshAllData();
  }, [refreshAllData]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userData");
    navigation.replace("Login");
  };

  // =========================
  // Component: UsageCard
  // =========================
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

  // =========================
  // Component: DeviceItem
  // =========================
  const DeviceItem = ({
    name,
    consumption,
    rank,
  }: {
    name: string;
    consumption: string;
    rank: number;
  }) => {
    // Get rank-based color
    const getRankColor = (rank: number): string => {
      switch (rank) {
        case 1:
          return "#FFD700"; // Gold for 1st
        case 2:
          return "#C0C0C0"; // Silver for 2nd
        case 3:
          return "#CD7F32"; // Bronze for 3rd
        default:
          return "#666666";
      }
    };

    // Get rank icon
    const getRankIcon = (rank: number): string => {
      switch (rank) {
        case 1:
          return "emoji-events"; // Trophy icon for 1st
        case 2:
          return "military-tech"; // Medal icon for 2nd
        case 3:
          return "workspace-premium"; // Premium icon for 3rd
        default:
          return "power"; // Default power icon
      }
    };

    return (
      <View style={styles.deviceItem}>
        <View
          style={[styles.deviceIcon, { backgroundColor: getRankColor(rank) }]}
        >
          <Icon name={getRankIcon(rank)} size={20} color="#fff" />
        </View>
        <Text style={styles.deviceName}>{name}</Text>
        <Text style={styles.deviceConsumption}>{consumption}</Text>
      </View>
    );
  };

  // =========================
  // Component: TopDevicesSection
  // =========================
  const TopDevicesSection = () => {
    if (loadingTopDevices) {
      return (
        <View style={styles.devicesContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={styles.loadingText}>Loading device data...</Text>
        </View>
      );
    }

    if (!hasRegisteredAppliances) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="devices" size={32} color="#ccc" />
          <Text style={styles.noDataText}>No registered appliances</Text>
          <Text style={styles.noDataSubText}>
            Register your appliances to see energy consumption data
          </Text>
        </View>
      );
    }

    if (topDevices.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="show-chart" size={32} color="#ccc" />
          <Text style={styles.noDataText}>No consumption data available</Text>
          <Text style={styles.noDataSubText}>
            Energy usage data will appear here once devices are used
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.devicesContainer}>
        {topDevices.map((device, index) => (
          <DeviceItem
            key={device.device_id}
            name={device.appliance_name}
            consumption={`${device.total_kwh.toFixed(1)} kWh`}
            rank={index + 1}
          />
        ))}
      </View>
    );
  };

  // =========================
  // Home Content Renderer
  // =========================
  const renderHomeContent = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 150 }}
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
        {billLoading ? (
          <ActivityIndicator size="small" color="#FFD600" />
        ) : monthlyBill ? (
          <>
            <Text style={styles.billAmount}>{monthlyBill}</Text>
            {billTimestamp && (
              <Text style={[styles.billLabel, { fontSize: 10, opacity: 0.7 }]}>
                Updated: {new Date(billTimestamp).toLocaleDateString()}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.billAmount}>No data</Text>
        )}
        <Text style={styles.billLabel}>Monthly Bill</Text>
      </View>

      <Text style={styles.sectionLabel}>
        Top Energy Consuming Devices in the Last 30 Days
      </Text>
      <TopDevicesSection />

      <View>
        <RecoSummary />
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
            onSuccess={() => {
              setActiveTab("home");
              // Refresh data when returning from successful registration
              setTimeout(() => refreshAllData(), 500);
            }}
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
