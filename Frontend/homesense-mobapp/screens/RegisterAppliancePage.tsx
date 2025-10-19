import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "./styles/RegisterAppliancePageStyles";
import Icon from "react-native-vector-icons/MaterialIcons";
import api from "../utils/api"; // ✅ axios instance
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Device {
  device_id: string;
}

interface RegisterAppliancePageProps {
  navigation: any;
  onSuccess?: () => void;
}

const RegisterAppliancePage: React.FC<RegisterAppliancePageProps> = ({
  navigation,
  onSuccess,
}) => {
  const [applianceName, setApplianceName] = useState("");
  const [applianceType, setApplianceType] = useState("");
  const [location, setLocation] = useState("");
  const [deviceId, setDeviceId] = useState("");

  // modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  // Other input states
  const [showOtherTypeInput, setShowOtherTypeInput] = useState(false);
  const [showOtherLocationInput, setShowOtherLocationInput] = useState(false);
  const [otherApplianceType, setOtherApplianceType] = useState("");
  const [otherLocation, setOtherLocation] = useState("");

  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const applianceTypes = [
    "Electric Fan",
    "Air Conditioner",
    "Refrigerator",
    "Washing Machine",
    "Television",
    "Microwave",
    "Rice Cooker",
    "Electric Stove",
    "Printer",
    "Computer",
    "Router/Wifi",
    "Other",
  ];

  const locations = [
    "Bedroom",
    "Living Room",
    "Kitchen",
    "Dining Room",
    "Study Room",
    "Other",
  ];

  // 🔌 Fetch available device IDs from backend
  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!storedUserData) return;
        const parsedUser = JSON.parse(storedUserData);
        const household_id = parsedUser.household_id;
        const res = await api.get(
          `/devices/unregistered?household_id=${household_id}`
        );
        // ✅ normalize to array of { device_id: string }
        const rawDevices = res.data.devices || [];
        const normalized: Device[] = rawDevices.map((d: any) => ({
          device_id: typeof d === "string" ? d : d.device_id,
        }));
        setAvailableDevices(normalized);
      } catch (err) {
        console.error("Failed to fetch devices:", err);
        Alert.alert("Error", "Failed to load available devices.");
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();
  }, []);

  const handleRegisterAppliance = async () => {
    // Use custom type if "Other" was selected and custom input provided
    const finalApplianceType =
      showOtherTypeInput && otherApplianceType.trim()
        ? otherApplianceType.trim()
        : applianceType;

    // Use custom location if "Other" was selected and custom input provided
    const finalLocation =
      showOtherLocationInput && otherLocation.trim()
        ? otherLocation.trim()
        : location;

    if (
      !deviceId ||
      !applianceName.trim() ||
      !finalApplianceType ||
      !finalLocation
    ) {
      Alert.alert("Error", "Please fill out all fields before registering.");
      return;
    }

    try {
      const payload = {
        device_id: deviceId,
        appliance_name: applianceName, // ✅ align with backend
        appliance_type: finalApplianceType, // ✅ align with backend
        location: finalLocation,
      };
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!storedUserData) return [];
      const parsedUser = JSON.parse(storedUserData);
      const household_id = parsedUser.household_id;

      await api.post(`/appliances?household_id=${household_id}`, payload);

      Alert.alert("Success", "Appliance registered successfully!", [
        {
          text: "OK",
          onPress: () => {
            setApplianceName("");
            setApplianceType("");
            setLocation("");
            setDeviceId("");
            setOtherApplianceType("");
            setOtherLocation("");
            setShowOtherTypeInput(false);
            setShowOtherLocationInput(false);
            onSuccess?.();
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error registering appliance:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.detail || "Failed to register appliance."
      );
    }
  };

  const handleApplianceTypeSelect = (selectedType: string) => {
    if (selectedType === "Other") {
      setShowOtherTypeInput(true);
      setApplianceType("Other");
    } else {
      setShowOtherTypeInput(false);
      setOtherApplianceType("");
      setApplianceType(selectedType);
    }
    setShowTypeModal(false);
  };

  const handleLocationSelect = (selectedLocation: string) => {
    if (selectedLocation === "Other") {
      setShowOtherLocationInput(true);
      setLocation("Other");
    } else {
      setShowOtherLocationInput(false);
      setOtherLocation("");
      setLocation(selectedLocation);
    }
    setShowLocationModal(false);
  };

  const renderOption = (
    item: string,
    onSelect: (val: string) => void,
    close: () => void
  ) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => {
        onSelect(item);
        close();
      }}
    >
      <Text style={styles.optionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Appliance Registration</Text>

        {/* Device ID */}
        <View style={styles.formField}>
          <Text style={styles.label}>Smart Plug ID</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setShowDeviceModal(true)}
          >
            <Text style={styles.dropdownText}>
              {deviceId || "Select a device ID"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Appliance Name */}
        <View style={styles.formField}>
          <Text style={styles.label}>Appliance Name</Text>
          <TextInput
            style={styles.input}
            value={applianceName}
            onChangeText={setApplianceName}
            placeholder="Enter appliance name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Appliance Type */}
        <View style={styles.formField}>
          <Text style={styles.label}>Appliance Type</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setShowTypeModal(true)}
          >
            <Text style={styles.dropdownText}>
              {showOtherTypeInput && otherApplianceType
                ? otherApplianceType
                : applianceType || "Select appliance type"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Other Appliance Type Input */}
          {showOtherTypeInput && (
            <View style={styles.otherInputContainer}>
              <Text style={styles.otherInputLabel}>Specify Appliance Type</Text>
              <TextInput
                style={styles.input}
                value={otherApplianceType}
                onChangeText={setOtherApplianceType}
                placeholder="Enter custom appliance type"
                placeholderTextColor="#999"
              />
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.formField}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.dropdownText}>
              {showOtherLocationInput && otherLocation
                ? otherLocation
                : location || "Select location"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Other Location Input */}
          {showOtherLocationInput && (
            <View style={styles.otherInputContainer}>
              <Text style={styles.otherInputLabel}>Specify Location</Text>
              <TextInput
                style={styles.input}
                value={otherLocation}
                onChangeText={setOtherLocation}
                placeholder="Enter custom location"
                placeholderTextColor="#999"
              />
            </View>
          )}
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegisterAppliance}
        >
          <Text style={styles.registerButtonText}>Register Appliance</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Device Modal */}
      <Modal visible={showDeviceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Smart Plug ID</Text>
            {loadingDevices ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <FlatList
                data={availableDevices}
                keyExtractor={(item, index) =>
                  item.device_id ? item.device_id.toString() : index.toString()
                }
                renderItem={({ item }) =>
                  renderOption(item.device_id, setDeviceId, () =>
                    setShowDeviceModal(false)
                  )
                }
              />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDeviceModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Appliance Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Appliance Type</Text>
            <FlatList
              data={applianceTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderOption(item, handleApplianceTypeSelect, () =>
                  setShowTypeModal(false)
                )
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <FlatList
              data={locations}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderOption(item, handleLocationSelect, () =>
                  setShowLocationModal(false)
                )
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default RegisterAppliancePage;
