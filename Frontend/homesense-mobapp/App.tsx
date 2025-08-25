import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LandingPage from './screens/LandingPage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MainMenu from './screens/MainMenu';
import SettingsPage from './screens/SettingsPage';
import ConsumptionPage from './screens/ConsumptionPage';
import RegisterAppliancePage from './screens/RegisterAppliancePage';

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Signup: undefined;
  MainMenu: undefined;
  SettingsPage: undefined;
  ConsumptionPage: undefined;
  RegisterAppliancePage: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainMenu" component={MainMenu} options={{ animation: 'fade', freezeOnBlur: true }} />
        <Stack.Screen name="SettingsPage" component={SettingsPage} />
        <Stack.Screen name="ConsumptionPage" component={ConsumptionPage} options={{ animation: 'fade', freezeOnBlur: true }} />
        <Stack.Screen name="RegisterAppliancePage" component={RegisterAppliancePage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
