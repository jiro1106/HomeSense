import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { signupStyles as styles } from "./styles/SignupStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getPasswordRules,
  PasswordValidation,
} from "../utils/PasswordValidation";
import api from "../utils/api";
import axios from "axios";
type SignupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Signup"
>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [joinExisting, setJoinExisting] = useState(false);
  const [householdId, setHouseholdId] = useState("");

  const [passwordRules, setPasswordRules] = useState<PasswordValidation[]>([]);

  const validateEmail = (email: string) => {
    const re =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    return re.test(email.toLowerCase());
  };

  const handleSignup = async () => {
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Matches Unicode emoji range
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

    // 🚫 Check for uppercase letters
    if (/[A-Z]/.test(email)) {
      Alert.alert("Error", "Email must not contain uppercase letters.");
      return;
    }

    // 🚫 Check for emojis
    if (emojiRegex.test(email)) {
      Alert.alert("Error", "Email must not contain emojis.");
      return;
    }

    // 🚫 Check for emojis in username
    if (emojiRegex.test(username)) {
      Alert.alert("Error", "Username must not contain emojis.");
      return;
    }

    // 🚫 Check for emojis in password
    if (emojiRegex.test(password) || emojiRegex.test(confirmPassword)) {
      Alert.alert("Error", "Password must not contain emojis.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    const rules = getPasswordRules(password, confirmPassword);
    const isValid = rules.every((rule) => rule.valid);

    if (!isValid) {
      Alert.alert("Error", "Please fix the password requirements.");
      return;
    }

    try {
      // 📦 Build payload dynamically
      const payload: any = { email, username, password };
      if (joinExisting && householdId.trim() !== "") {
        payload.household_id = householdId.trim();
      }

      const res = await api.post(`/auth/register`, payload);

      if (res.status === 200) {
        Alert.alert("Success", "Account created successfully!", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert(
          "Error",
          error.response.data.detail || "Something went wrong"
        );
      } else {
        Alert.alert("Error", "Cannot connect to server. Please try again.");
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Small header logo row */}
          <View style={styles.logoContainer}>
            <View style={styles.logoTextRow}>
              <Text style={styles.logoTextH}>H</Text>
              <Image
                source={require("../assets/homesenseLogo.png")}
                style={styles.logoIcon}
              />
              <Text style={styles.logoText}>meSense</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentWrapper}>
            <Text style={styles.title}>Create your{"\n"}Account</Text>
            <Text style={styles.subtitle}>
              Enter your email and password to sign up
            </Text>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="johnsmith@gmail.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Username */}
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="John Smith"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            {/* Optional: Join Existing Household */}
            <View style={styles.joinContainer}>
              <TouchableOpacity
                onPress={() => setJoinExisting(!joinExisting)}
                style={styles.joinToggleButton}
              >
                <Ionicons
                  name={joinExisting ? "checkbox" : "square-outline"}
                  size={20}
                  color="#000"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.joinText}>Join existing household?</Text>
              </TouchableOpacity>

              {joinExisting && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Household ID (e.g. household3)"
                  value={householdId}
                  onChangeText={setHouseholdId}
                  autoCapitalize="none"
                />
              )}
            </View>
            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordRules(getPasswordRules(text, confirmPassword));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="********"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setPasswordRules(getPasswordRules(password, text));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 2, padding: 5 }}>
              {passwordRules.map((rule, index) => (
                <Text
                  key={index}
                  style={{
                    color: rule.valid ? "green" : "black",
                    fontSize: 15,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name={rule.valid ? "checkmark-circle" : "close-circle"}
                    size={15}
                    color={rule.valid ? "green" : "grey"}
                  />
                  {rule.label}
                </Text>
              ))}
            </View>

            {/* Create account button */}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>

            {/* Bottom link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}> Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupScreen;
