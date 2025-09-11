import React, { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LandingPage from './screens/LandingPage';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MainMenu from './screens/MainMenu';
import SettingsPage from './screens/SettingsPage';
import ConsumptionPage from './screens/ConsumptionPage';
import RegisterAppliancePage from './screens/RegisterAppliancePage';
import Bills from './screens/Bills';
import Recommendations from './screens/Recommendations';
import AccountSecurityPage from './screens/AccountSecurityPage'; 
import ElectricityProvider from './screens/ElectricityProvider';
import SavingMode from './screens/SavingMode';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Disable Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // returning true means we have handled it
          // so it will not exit or navigate back
          return true;
        }
      );
      return () => backHandler.remove();
    }
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false, // disables swipe-back on iOS
        }}
      >
        <Stack.Screen name="Landing" component={LandingPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainMenu" component={MainMenu} />
        <Stack.Screen name="SettingsPage" component={SettingsPage} />
        <Stack.Screen name="ConsumptionPage" component={ConsumptionPage} />
        <Stack.Screen name="RegisterAppliancePage" component={RegisterAppliancePage} />
        <Stack.Screen name="Bills" component={Bills} />
        <Stack.Screen name="Recommendations" component={Recommendations} />
        <Stack.Screen name="AccountSecurityPage" component={AccountSecurityPage} /> 
        <Stack.Screen name="ElectricityProvider" component={ElectricityProvider} />
        <Stack.Screen name="SavingMode" component={SavingMode} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
