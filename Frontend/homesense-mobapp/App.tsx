import React, { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // ✅ added

import LandingPage from "./screens/LandingPage";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import MainMenu from "./screens/MainMenu";
import SettingsPage from "./screens/SettingsPage";
import ConsumptionPage from "./screens/ConsumptionPage";
import RegisterAppliancePage from "./screens/RegisterAppliancePage";
import Bills from "./screens/Bills";
import Recommendations from "./screens/Recommendations";
import AccountSecurityPage from "./screens/AccountSecurityPage";
import ElectricityProvider from "./screens/ElectricityProvider";
import SavingMode from "./screens/SavingMode";
import InstructionPage from "./screens/InstructionPage";
import * as Notifications from "expo-notifications";

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Signup: undefined;
  MainMenu: undefined;
  SettingsPage: undefined;
  ConsumptionPage: undefined;
  RegisterAppliancePage: undefined;
  Bills: undefined;
  Recommendations: undefined;
  AccountSecurityPage: undefined;
  ElectricityProvider: undefined;
  SavingMode: undefined;
  InstructionPage: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  // Disable Android back button
  useEffect(() => {
    if (Platform.OS === "android") {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );
      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    async function setupNotifications() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission for notifications not granted!");
        return;
      }

      // Android-specific notification channel (required)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    }

    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Landing"
          screenOptions={{
            headerShown: false,
            animation: "none",
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="Landing" component={LandingPage} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="MainMenu" component={MainMenu} />
          <Stack.Screen name="SettingsPage" component={SettingsPage} />
          <Stack.Screen name="ConsumptionPage" component={ConsumptionPage} />
          <Stack.Screen
            name="RegisterAppliancePage"
            component={RegisterAppliancePage}
          />
          <Stack.Screen name="Bills" component={Bills} />
          <Stack.Screen name="Recommendations" component={Recommendations} />
          <Stack.Screen
            name="AccountSecurityPage"
            component={AccountSecurityPage}
          />
          <Stack.Screen
            name="ElectricityProvider"
            component={ElectricityProvider}
          />
          <Stack.Screen name="SavingMode" component={SavingMode} />
          <Stack.Screen name="InstructionPage" component={InstructionPage} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
