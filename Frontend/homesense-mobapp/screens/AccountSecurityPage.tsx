import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import styles from "./styles/AccountSecurityStyles";
import {
  getPasswordRules,
  PasswordValidation,
} from "../utils/PasswordValidation";
import { Ionicons } from "@expo/vector-icons";
import api from "../utils/api";

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "AccountSecurityPage"
>;

const AccountSecurityPage = () => {
  const navigation = useNavigation<NavProp>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");

  const [enableChangePass, setEnableChangePass] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState<PasswordValidation[]>([]);

  const [isSaveEnabled, setIsSaveEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [householdId, setHouseholdId] = useState(null);
  // ✅ Inline success messages
  const [usernameSuccessMsg, setUsernameSuccessMsg] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        // Get user data from AsyncStorage
        const userData = await AsyncStorage.getItem("userData");
        console.log("Stored userData:", userData);

        if (userData) {
          const user = JSON.parse(userData);
          console.log("Parsed user object:", user);

          if (user.household_id) {
            setHouseholdId(user.household_id);
            console.log("Household ID:", user.household_id);
          }
          // Check if we have email and username directly in the stored data
          if (user.email && user.username) {
            // If login endpoint returns user data directly
            setUsername(user.username);
            setOriginalUsername(user.username);
            setEmail(user.email);
            setPassword("********");
            console.log("Using data from stored login response");
          } else {
            // If not, we need to fetch from profile endpoint
            // But we need the email first - check if user stored it elsewhere
            const storedEmail = await AsyncStorage.getItem("userEmail");
            if (storedEmail) {
              console.log("Found email in separate storage:", storedEmail);
              await fetchUserProfile(storedEmail);
            } else {
              console.log("No email available to fetch profile");
              Alert.alert(
                "Error",
                "Please log in again to refresh your session"
              );
              navigation.goBack();
            }
          }
        } else {
          console.log("No userData found in AsyncStorage");
          Alert.alert("Error", "Please log in again");
          navigation.goBack();
        }
      } catch (error: any) {
        console.log("Error loading user data:", error);
        Alert.alert("Error", "Failed to load user profile");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserProfile = async (userEmail: string) => {
      try {
        console.log("Fetching profile for email:", userEmail);
        const response = await api.get(
          `/user/profile?email=${encodeURIComponent(userEmail)}`
        );
        console.log("Profile API Response:", response.data);

        if (response.data) {
          setUsername(response.data.username || "");
          setOriginalUsername(response.data.username || "");
          setEmail(response.data.email || "");
          setPassword("********");
        }
      } catch (apiError: any) {
        console.log("Profile API Error:", apiError.response?.data);
        Alert.alert("Error", "Failed to fetch user profile from server");
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    const usernameChanged = username !== originalUsername;
    const passwordChanged =
      enableChangePass &&
      !!newPassword &&
      !!confirmPassword &&
      newPassword === confirmPassword;

    setIsSaveEnabled(usernameChanged || passwordChanged);
  }, [
    username,
    originalUsername,
    enableChangePass,
    newPassword,
    confirmPassword,
  ]);

  const handleSave = async () => {
    try {
      if (!email) {
        Alert.alert("Error", "No email available for update");
        return;
      }

      let updatePayload: any = {
        username: username.trim(),
      };

      // If password change is requested
      if (enableChangePass) {
        if (!newPassword || !confirmPassword) {
          Alert.alert("Error", "Please enter and confirm your new password.");
          return;
        }

        if (!currentPassword) {
          Alert.alert(
            "Error",
            "Please enter your current password to change password."
          );
          return;
        }

        const rules = getPasswordRules(newPassword, confirmPassword);
        setPasswordRules(rules);

        const isValid = rules.every((rule) => rule.valid);
        if (!isValid) {
          Alert.alert("Error", "Please fix the password requirements.");
          return;
        }

        updatePayload.current_password = currentPassword;
        updatePayload.new_password = newPassword;
      }

      console.log("Sending update payload:", updatePayload);
      console.log("Using email:", email);

      // Make API call to update profile
      const response = await api.put(
        `/user/profile?email=${encodeURIComponent(email)}`,
        updatePayload
      );
      console.log("Update response:", response.data);

      if (response.status === 200) {
        // Update local storage with new data
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const user = JSON.parse(userData);
          const updatedUser = {
            ...user,
            username: username.trim(),
            email: email, // Ensure email is included
          };
          await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        }

        // ✅ Show success alerts + inline messages
        if (enableChangePass) {
          setPassword("********");
          setEnableChangePass(false);
          setNewPassword("");
          setConfirmPassword("");
          setCurrentPassword("");
          setPasswordSuccessMsg("Password changed successfully.");
          setTimeout(() => setPasswordSuccessMsg(""), 4000);
          Alert.alert("Success", "Password changed successfully.");
        }

        if (isEditingUsername) {
          setIsEditingUsername(false);
          setOriginalUsername(username);
          setUsernameSuccessMsg("Username changed successfully.");
          setTimeout(() => setUsernameSuccessMsg(""), 4000);
          Alert.alert("Success", "Username changed successfully.");
        }
      }
    } catch (error: any) {
      console.log("Update error:", error);
      console.log("Error response:", error.response?.data);

      if (error.response?.status === 401) {
        Alert.alert("Error", "Current password is incorrect");
      } else if (error.response?.status === 400) {
        Alert.alert("Error", error.response.data.detail || "Invalid request");
      } else if (error.response?.status === 404) {
        Alert.alert("Error", "User not found");
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }
    }
  };

  const handleEditUsername = () => {
    Alert.alert("Edit Username", "Do you want to edit your username?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => setIsEditingUsername(true) },
    ]);
  };

  const handleCancelEditUsername = () => {
    setUsername(originalUsername);
    setIsEditingUsername(false);
  };

  const handleCancelChangePassword = () => {
    setEnableChangePass(false);
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleEnableChangePassword = () => {
    Alert.alert(
      "Change Password",
      "Are you sure you want to change your password?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => setEnableChangePass(true) },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000ff" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-back" size={24} color="#fcfcfcff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Account & Security</Text>
          </View>
          <View
            style={[
              styles.form,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text>Loading user data...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000ff" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}></SafeAreaView>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Account & Security</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.idTitle}>
            HOUSEHOLD ID:{" "}
            <Text style={styles.idText}>{householdId || "Not available"}</Text>
          </Text>
          {/* Form */}
          <View style={styles.form}>
            {/* Username */}
            <Text style={styles.label}>Username</Text>
            <View style={styles.rowInput}>
              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                  !isEditingUsername && styles.disabledInput,
                ]}
                value={username}
                onChangeText={setUsername}
                editable={isEditingUsername}
                placeholder={username ? "" : "No username set"}
              />
              {!isEditingUsername ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditUsername}
                >
                  <Icon name="edit" size={22} color="#000" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelButton2}
                  onPress={handleCancelEditUsername}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            {usernameSuccessMsg ? (
              <Text style={styles.successMessage}>{usernameSuccessMsg}</Text>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              keyboardType="email-address"
              placeholder={email ? "" : "No email available"}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={password}
              editable={false}
              secureTextEntry
              placeholder="********"
            />

            {!enableChangePass ? (
              <TouchableOpacity
                onPress={handleEnableChangePassword}
                style={styles.changePasswordTextButton}
              >
                <Text style={styles.changePasswordLink}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: 15 }}>
                {/* Current Password */}
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter current password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Icon
                      name={showNewPassword ? "visibility" : "visibility-off"}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setPasswordRules(getPasswordRules(text, confirmPassword));
                    }}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Icon
                      name={showNewPassword ? "visibility" : "visibility-off"}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setPasswordRules(getPasswordRules(newPassword, text));
                    }}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Confirm new password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon
                      name={
                        showConfirmPassword ? "visibility" : "visibility-off"
                      }
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 2, padding: 5 }}>
                  {passwordRules.map((rule, index) => (
                    <Text
                      key={index}
                      style={{
                        color: rule.valid ? "green" : "black",
                        fontSize: 15,
                        fontWeight: rule.valid ? "500" : "500",
                        marginBottom: 8,
                      }}
                    >
                      <Ionicons
                        name={rule.valid ? "checkmark-circle" : "close-circle"}
                        size={15}
                        color={rule.valid ? "green" : "grey"}
                      />
                      {rule.valid ? "" : ""} {rule.label}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelChangePassword}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {passwordSuccessMsg ? (
                  <Text style={styles.successMessage}>
                    {passwordSuccessMsg}
                  </Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: isSaveEnabled ? "#000" : "#ccc" },
              ]}
              onPress={handleSave}
              disabled={!isSaveEnabled}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <Text style={styles.noticeText}>
              <Text style={styles.noticeTitle}>NOTE:</Text> Please do not share
              your personal account information with anyone you do not know.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AccountSecurityPage;
