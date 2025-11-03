import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import styles from "./styles/AboutStyles";

type NavProp = NativeStackNavigationProp<RootStackParamList, "InstructionPage">;

const AboutPage = () => {
  const navigation = useNavigation<NavProp>();

  const team = [
    {
      name: "Jiro Rafael Layug",
      role: "Software Developer",
      image: require("../assets/layugImg.png"), // replace with your image path
    },
    {
      name: "Xavier Gelligan",
      role: "Software Developer",
      image: require("../assets/gelliganImg.jpg"),
    },
    {
      name: "Alfeah Punzalan",
      role: "Software Developer",
      image: require("../assets/punzalanImg.jpg"),
    },
  ];

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
          <Text style={styles.headerTitle}>About</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.introContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>H</Text>
            <Image
              source={require("../assets/homesenseLogo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text style={styles.logoText}>meSense</Text>
          </View>
        </View>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>About Us</Text>
          <Image
            source={require("../assets/smartplug.png")}
            resizeMode="cover"
            style={styles.summaryImage}
          />
          <Text style={styles.summary}>
            HomeSense helps you take control of your home’s electricity use, all
            in one place. With smart plugs, it tracks each appliance in real
            time, predicts your next bill, and gives you personalized
            energy-saving tips. Stay informed, save more, and make your home
            smarter and more efficient.
          </Text>
        </View>
        <View style={styles.purposeSection}>
          <Text style={styles.summaryTitle}>Our Story</Text>
          <Image
            source={require("../assets/electricMeter.jpg")}
            resizeMode="contain"
            style={styles.purposeImage}
          />
          <Text style={styles.summary}>
            We developed HomeSense after noticing how many households struggle
            with rising electricity costs and lack visibility into where their
            energy goes. Our goal was to create a system that not only tracks
            power usage but also guides users toward smarter energy habits
            through real-time insights and predicted electricity bills.
          </Text>
        </View>
        <View style={styles.outerTeamSection}>
          <View style={styles.teamSection}>
            <Text style={styles.teamTitle}>Meet Our Team</Text>
            {team.map((member, index) => (
              <View key={index} style={styles.teamMember}>
                <Image
                  source={member.image}
                  style={styles.memberImage}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.outerContactSection}>
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Get in Touch</Text>
            <TouchableOpacity
              style={styles.emailWithText}
              onPress={() => Linking.openURL("mailto:app.homesense@gmail.com")}
              activeOpacity={0.7}
            >
              <Icon name="email" size={24} color="#000000ff" />
              <Text style={styles.email}>app.homesense@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.versionText}>v1.0.0</Text>
        <Text style={styles.footerText}>
          © 2025 HomeSense. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
};

export default AboutPage;
