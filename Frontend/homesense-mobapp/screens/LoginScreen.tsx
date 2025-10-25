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
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import api from "../utils/api";
import { styles } from "./styles/LoginStyles";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (emojiRegex.test(email) || emojiRegex.test(password)) {
      Alert.alert("Error", "Emojis are not allowed in email or password.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password: password,
      });

      const userData = response.data;

      // Persist login session
      await AsyncStorage.multiSet([
        ["isLoggedIn", "true"],
        ["userData", JSON.stringify(userData)],
        ["householdId", userData.household_id],
        ["email", userData.email],
        ["username", userData.username],
      ]);

      Alert.alert("Success", "Login successful!", [
        {
          text: "OK",
          onPress: () => navigation.replace("MainMenu"),
        },
      ]);
    } catch (error: any) {
      console.warn("Login error:", error);

      if (error.response?.status === 401) {
        Alert.alert("Error", "Incorrect email or password.");
      } else if (error.response?.status === 400) {
        Alert.alert("Error", error.response.data.detail || "Bad request.");
      } else if (error.response?.data?.detail) {
        Alert.alert("Error", error.response.data.detail);
      } else {
        Alert.alert("Error", "Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#000" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
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

        {/* Login Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Login</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Signup")}
              disabled={loading}
            >
              <Text style={styles.signUpLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <TextInput
            style={[styles.input, loading && { opacity: 0.6 }]}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* Password + Eye Icon */}
          <View style={[styles.passwordContainer, loading && { opacity: 0.6 }]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              disabled={loading}
            >
              <Ionicons
                name={secureText ? "eye-off" : "eye"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
