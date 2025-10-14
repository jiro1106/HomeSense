import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import styles from "./styles/SettingsPageStyles";

type SettingsItemProps = {
  id?: string;
  icon: string;
  title?: string;
  showArrow?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
};

const SettingsItem = React.memo(
  ({
    id,
    icon,
    title,
    showArrow = true,
    showToggle = false,
    toggleValue = false,
    onToggle = () => {},
    onPress = () => {},
  }: SettingsItemProps) => {
    const trackColor = useMemo(
      () => ({ false: "#D3D3D3", true: "#FFD700" }),
      []
    );

    return (
      <TouchableOpacity
        style={styles.settingsItem}
        onPress={!showToggle ? onPress : undefined} // only clickable if not a switch
        activeOpacity={0.7}
      >
        <View style={styles.settingsItemLeft}>
          <Icon
            name={icon}
            size={24}
            color="#666"
            style={styles.settingsIcon}
          />
          {title && <Text style={styles.settingsText}>{title}</Text>}
        </View>
        <View style={styles.settingsItemRight}>
          {showToggle ? (
            <View collapsable={false} style={styles.switchContainer}>
              <Switch
                key={id}
                nativeID={id}
                testID={id}
                accessibilityLabel={id}
                value={!!toggleValue}
                onValueChange={onToggle}
                trackColor={trackColor}
                thumbColor="#fff"
                ios_backgroundColor="#D3D3D3"
              />
            </View>
          ) : showArrow ? (
            <Icon name="chevron-right" size={24} color="#666" />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }
);

type SettingsPageNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SettingsPage"
>;

const SettingsPage = () => {
  const navigation = useNavigation<SettingsPageNavProp>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("isLoggedIn"); // just clear session flag
    navigation.replace("Login");
  };

  const handleNotificationsToggle = useCallback((value: boolean) => {
    setNotificationsEnabled(value);
    if (value) {
      Alert.alert(
        "Notifications Enabled",
        "You will now receive notifications."
      );
    } else {
      Alert.alert(
        "Notifications Disabled",
        "You will no longer receive notifications."
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000ff" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.replace("MainMenu")}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          {/* placeholder for right side to balance flex */}
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
      {/* Settings Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Account</Text>

        <SettingsItem
          icon="security"
          title="Account & Security"
          onPress={() => navigation.navigate("AccountSecurityPage")}
        />
        <SettingsItem
          icon="flash-on"
          title="Electricity Provider"
          onPress={() => navigation.navigate("ElectricityProvider")}
        />
        <SettingsItem
          icon="eco"
          title="Saving Mode"
          onPress={() => navigation.navigate("SavingMode")}
        />
        <SettingsItem
          icon="menu-book"
          title="Instructions"
          onPress={() => navigation.navigate("InstructionPage")}
        />
        {/* Notifications */}
        <SettingsItem
          id="notifications-switch"
          icon="notifications"
          title="Notifications"
          showToggle={true}
          toggleValue={notificationsEnabled}
          onToggle={handleNotificationsToggle}
        />
      </ScrollView>

      {/* Bottom Logout Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsPage;
