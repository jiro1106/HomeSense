import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import styles from "./styles/InstructionPageStyles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "InstructionPage">;

const InstructionPage = () => {
  const navigation = useNavigation<NavProp>();

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
          <Text style={styles.headerTitle}>Instructions</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.contentHeader}>
          <Icon name="lightbulb-outline" size={28} color="#FFD700" />
          <Text style={styles.contentTitle}>HomeSense Quick Start Guide</Text>
        </View>

        <Text style={styles.intro}>
          Welcome to <Text style={{ fontWeight: "600" }}>HomeSense!</Text> Your
          smart partner for tracking and saving electricity at home. Follow
          these simple steps to get started!
        </Text>

        {/* Step 1 */}
        <View style={styles.stepCard}>
          <Icon name="power" size={32} color="#FFD700" style={styles.icon} />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Step 1: Connect Your Smart Plugs
            </Text>
            <Text style={styles.stepText}>
              For the initial setup, the HomeSense team will set and configure
              everything for the household. After the setup, you can start
              plugging in your <Text style={styles.bold}>smart plugs.</Text>{" "}
              Once linked, you can start using the app.
            </Text>
            <Text style={styles.tip}>
              💡 Tip: Name your plugs after the appliance for easy tracking.
            </Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.stepCard}>
          <Icon
            name="add-circle-outline"
            size={32}
            color="#FFD700"
            style={styles.icon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Register Appliances</Text>
            <Text style={styles.stepText}>
              Go to the <Text style={styles.bold}>Appliances</Text> tab, tap{" "}
              <Text style={styles.bold}>Add Appliance</Text>, and select the
              appliance type connected to your plug. We advise to register the
              plugs one by one to avoid confusion for the smart plug ID.
            </Text>
          </View>
        </View>

        {/* Step 3 */}
        <View style={styles.stepCard}>
          <Icon
            name="bar-chart"
            size={32}
            color="#FFD700"
            style={styles.icon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: View Your Usage</Text>
            <Text style={styles.stepText}>
              Open the <Text style={styles.bold}>Appliance Records Page</Text>{" "}
              to see your live and historical energy use. Tap any appliance to
              view detailed graphs about individual and total consumption.
            </Text>
            <Text style={styles.stepText}>
              To{" "}
              <Text style={styles.bold}>
                unregister or remove an appliance,
              </Text>{" "}
              choose an appliance and swipe left to delete them. You can
              register them anytime you want!
            </Text>
          </View>
        </View>

        {/* Step 4 */}
        <View style={styles.stepCard}>
          <Icon name="settings" size={32} color="#FFD700" style={styles.icon} />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Step 4: Set Your Savings Mode and Electricity Provider
            </Text>
            <Text style={styles.stepText}>
              Go to Settings → <Text style={styles.bold}>Savings Mode</Text>.
              Choose between:
            </Text>
            <Text style={styles.mode}>High – Strict, detailed tips.</Text>
            <Text style={styles.mode}>Medium – Balanced suggestions.</Text>
            <Text style={styles.mode}>Low – Relaxed, minimal alerts.</Text>
            <Text style={styles.stepText}>
              Next, go to Settings →{" "}
              <Text style={styles.bold}>Electricity Provider</Text>. Choose
              either MERALCO or BATELEC.
            </Text>
          </View>
        </View>

        {/* Step 5 */}
        <View style={styles.stepCard}>
          <Icon
            name="tips-and-updates"
            size={32}
            color="#FFD700"
            style={styles.icon}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              Step 5: Get Smart Recommendations
            </Text>
            <Text style={styles.stepText}>
              Check the <Text style={styles.bold}>Recommendations</Text> tab for
              personalized energy-saving tips based on your habits.
            </Text>
          </View>
        </View>

        {/* Step 6 */}
        <View style={styles.stepCard}>
          <Icon name="savings" size={32} color="#FFD700" style={styles.icon} />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 6: Track Your Savings</Text>
            <Text style={styles.stepText}>
              View your reduced energy usage and estimated bill savings in your{" "}
              <Text style={styles.bold}>Dashboard</Text>, every kWh counts!
            </Text>
          </View>
        </View>

        {/* Done Section */}
        <View style={styles.footer}>
          <Icon name="check-circle" size={36} color="#2E7D32" />
          <Text style={styles.doneTitle}>You're All Set!</Text>
          <Text style={styles.doneText}>
            Enjoy a smarter, more efficient home with HomeSense!
          </Text>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Icon name="help-outline" size={24} color="#2E7D32" />
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Need more help?</Text>
            <Text style={styles.helpEmail}>
              Contact us at{" "}
              <Text style={styles.boldEmail}>app.homesense@gmail.com</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default InstructionPage;
