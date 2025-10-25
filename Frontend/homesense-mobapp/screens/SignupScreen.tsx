import React, { useState, useEffect } from "react";
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
  Modal,
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

type SignupStep = "email" | "verification" | "details";

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();

  // ===== STEP TRACKING =====
  const [currentStep, setCurrentStep] = useState<SignupStep>("email");

  // ===== EMAIL VERIFICATION STEP =====
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResendCountdown, setCodeResendCountdown] = useState(0);

  // ===== SIGNUP DETAILS STEP =====
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [joinExisting, setJoinExisting] = useState(false);
  const [householdId, setHouseholdId] = useState("");

  const [passwordRules, setPasswordRules] = useState<PasswordValidation[]>([]);

  // ===== TERMS & CONDITIONS =====
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  // ===== LOADING & ERROR STATES =====
  const [loading, setLoading] = useState(false);

  // ===== COUNTDOWN TIMER FOR RESEND =====
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (codeResendCountdown > 0) {
      interval = setInterval(() => {
        setCodeResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [codeResendCountdown]);

  // ===== UTILITY FUNCTIONS =====
  const validateEmail = (email: string) => {
    const re =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    return re.test(email.toLowerCase());
  };

  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

  // ===== STEP 1: SEND VERIFICATION CODE =====
  const handleSendVerification = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    if (/[A-Z]/.test(email)) {
      Alert.alert("Error", "Email must not contain uppercase letters.");
      return;
    }

    if (emojiRegex.test(email)) {
      Alert.alert("Error", "Email must not contain emojis.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/send-verification", { email });
      setCurrentStep("verification");
      setVerificationCode("");
      setCodeResendCountdown(60); // 60 second cooldown before resend
      Alert.alert(
        "Success",
        "Verification code sent to your email. It will expire in 10 minutes."
      );
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert(
          "Error",
          error.response.data.detail || "Failed to send verification code."
        );
      } else {
        Alert.alert("Error", "Cannot connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 2: VERIFY CODE =====
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }

    if (verificationCode.length !== 6) {
      Alert.alert("Error", "Verification code must be 6 digits.");
      return;
    }

    if (!/^\d+$/.test(verificationCode)) {
      Alert.alert("Error", "Verification code must contain only numbers.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-code", {
        email,
        code: verificationCode,
      });
      Alert.alert("Success", "Email verified! Please complete your signup.");
      setCurrentStep("details");
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert(
          "Error",
          error.response.data.detail || "Invalid verification code."
        );
      } else {
        Alert.alert("Error", "Cannot connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 3: COMPLETE SIGNUP =====
  const handleCompleteSignup = async () => {
    if (!agreedToTerms) {
      Alert.alert("Terms Required", "You must agree to the Terms and Conditions to continue.");
      return;
    }
    if (!username || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }

    if (emojiRegex.test(username)) {
      Alert.alert("Error", "Username must not contain emojis.");
      return;
    }

    if (emojiRegex.test(password) || emojiRegex.test(confirmPassword)) {
      Alert.alert("Error", "Password must not contain emojis.");
      return;
    }

    const rules = getPasswordRules(password, confirmPassword);
    const isValid = rules.every((rule) => rule.valid);

    if (!isValid) {
      Alert.alert("Error", "Please fix the password requirements.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { email, username, password };
      if (joinExisting && householdId.trim() !== "") {
        payload.household_id = householdId.trim();
      }

      await api.post("/auth/register", payload);

      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert(
          "Error",
          error.response.data.detail || "Something went wrong"
        );
      } else {
        Alert.alert("Error", "Cannot connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== HELPER: BACK BUTTON =====
  const handleBackPress = () => {
    if (currentStep === "verification") {
      setCurrentStep("email");
      setVerificationCode("");
      setCodeResendCountdown(0);
    } else if (currentStep === "details") {
      setCurrentStep("verification");
    } else {
      navigation.navigate("Login");
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
            {/* ===== STEP 1: EMAIL ENTRY ===== */}
            {currentStep === "email" && (
              <>
                <Text style={styles.title}>Create your{"\n"}Account</Text>
                <Text style={styles.subtitle}>
                  Enter your email to get started
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="johnsmith@gmail.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.6 }]}
                  onPress={handleSendVerification}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text style={styles.footerLink}> Log In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ===== STEP 2: CODE VERIFICATION ===== */}
            {currentStep === "verification" && (
              <>
                <Text style={styles.title}>Verify{"\n"}Your Email</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to{"\n"}
                  <Text style={{ fontWeight: "600" }}>{email}</Text>
                </Text>

                {/* Verification Code Input */}
                <View style={styles.field}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.codeInputContainer}>
                    <TextInput
                      style={styles.codeInput}
                      placeholder="000000"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      editable={!loading}
                      placeholderTextColor="#D1D5DB"
                    />
                    <View style={styles.codeCharCount}>
                      <Text style={styles.codeCharCountText}>
                        {verificationCode.length}/6
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    Check your email for the code
                  </Text>
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.6 }]}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                {/* Resend Code Section */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Didn't receive code?</Text>
                  <TouchableOpacity
                    onPress={handleSendVerification}
                    disabled={loading || codeResendCountdown > 0}
                  >
                    <Text
                      style={[
                        styles.footerLink,
                        (loading || codeResendCountdown > 0) && {
                          color: "#9CA3AF",
                        },
                      ]}
                    >
                      {codeResendCountdown > 0
                        ? ` Resend in ${codeResendCountdown}s`
                        : " Resend"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ===== STEP 3: SIGNUP DETAILS ===== */}
            {currentStep === "details" && (
              <>
                <Text style={styles.title}>Complete{"\n"}Your Signup</Text>
                <Text style={styles.subtitle}>
                  Create your username and password
                </Text>

                {/* Username */}
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Smith"
                    value={username}
                    onChangeText={setUsername}
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    {username.length}/50 characters
                  </Text>
                </View>

                {/* Join Existing Household */}
                <View style={styles.joinContainer}>
                  <TouchableOpacity
                    onPress={() => setJoinExisting(!joinExisting)}
                    style={styles.joinToggleButton}
                    disabled={loading}
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
                      editable={!loading}
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
                        setPasswordRules(
                          getPasswordRules(text, confirmPassword)
                        );
                      }}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
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
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Rules */}
                <View style={{ marginTop: 12, marginBottom: 16, padding: 5 }}>
                  {passwordRules.map((rule, index) => (
                    <Text
                      key={index}
                      style={{
                        color: rule.valid ? "#10B981" : "#374151",
                        fontSize: 14,
                        fontWeight: "500",
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons
                        name={
                          rule.valid ? "checkmark-circle" : "close-circle"
                        }
                        size={16}
                        color={rule.valid ? "#10B981" : "#9CA3AF"}
                        style={{ marginRight: 6 }}
                      />
                      {rule.label}
                    </Text>
                  ))}
                </View>

                {/* Terms and Conditions Agreement */}
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    disabled={loading}
                    style={{ marginRight: 8 }}
                  >
                    <Ionicons
                      name={agreedToTerms ? "checkbox" : "square-outline"}
                      size={20}
                      color="#000"
                    />
                  </TouchableOpacity>
                  <Text style={styles.termsText}>I agree to the</Text>
                  <TouchableOpacity onPress={() => setTermsVisible(true)} disabled={loading}>
                    <Text style={styles.termsLink}> Terms and Conditions</Text>
                  </TouchableOpacity>
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  style={[
                    styles.button,
                    (loading || !agreedToTerms) && { opacity: 0.6 },
                  ]}
                  onPress={handleCompleteSignup}
                  disabled={loading || !agreedToTerms}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Terms & Conditions Modal */}
      <Modal visible={termsVisible} transparent animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms and Conditions</Text>
              <TouchableOpacity onPress={() => setTermsVisible(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator
                contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
              >
                <Text style={styles.modalSectionTitle}>1. Data Collection and Usage</Text>
                <Text style={styles.modalParagraph}>
                  HomeSense collects data from your connected smart plugs to monitor and analyze household energy consumption. The data is used solely for providing insights, bill predictions, and recommendations.
                </Text>
                <Text style={styles.modalSectionTitle}>2. Privacy</Text>
                <Text style={styles.modalParagraph}>
                  User data is stored securely in the HomeSense system and is not shared with third parties without consent.
                </Text>
                <Text style={styles.modalSectionTitle}>3. Device Connectivity</Text>
                <Text style={styles.modalParagraph}>
                  Developers are responsible for connecting the user's smart plugs. HomeSense is not liable for issues arising from hardware malfunctions or network connectivity errors.
                </Text>
                <Text style={styles.modalSectionTitle}>4. Predictions and Recommendations</Text>
                <Text style={styles.modalParagraph}>
                  All energy predictions and recommendations are based on available data and algorithms. They are estimates and may not always reflect actual usage or costs.
                </Text>
                <Text style={styles.modalSectionTitle}>5. Account and Household Management</Text>
                <Text style={styles.modalParagraph}>
                  Each user belongs to a household. The household owner or admin may have access to shared energy data for monitoring and reporting.
                </Text>
                <Text style={styles.modalSectionTitle}>6. Limitation of Liability</Text>
                <Text style={styles.modalParagraph}>
                  HomeSense is not responsible for data loss, device issues, or inaccuracies resulting from user error or third-party services.
                </Text>
                <Text style={styles.modalSectionTitle}>7. Agreement</Text>
                <Text style={styles.modalParagraph}>
                  By creating an account, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
                </Text>
              </ScrollView>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.button} onPress={() => setTermsVisible(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SignupScreen;