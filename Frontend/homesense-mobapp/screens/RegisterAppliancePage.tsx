import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { styles } from './styles/RegisterAppliancePageStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../utils/api'; // ✅ axios instance

interface Device {
  device_id: string;
}

interface RegisterAppliancePageProps {
  navigation: any;
  onSuccess?: () => void;
}

const RegisterAppliancePage: React.FC<RegisterAppliancePageProps> = ({ navigation, onSuccess }) => {
  const [applianceName, setApplianceName] = useState('');
  const [applianceType, setApplianceType] = useState('');
  const [location, setLocation] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const applianceTypes = [
    'Electric Fan',
    'Air Conditioner',
    'Refrigerator',
    'Washing Machine',
    'Television',
    'Microwave',
    'Toaster',
    'Coffee Maker',
    'Blender',
    'Other',
  ];

  const locations = [
    'Bedroom',
    'Living Room',
    'Kitchen',
    'Bathroom',
    'Dining Room',
    'Study Room',
    'Garage',
    'Basement',
    'Attic',
    'Other',
  ];

  // 🔌 Fetch available device IDs from backend
  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const res = await api.get('/devices/unregistered');
        // ✅ normalize to array of { device_id: string }
        const rawDevices = res.data.devices || [];
        const normalized: Device[] = rawDevices.map((d: any) => ({
          device_id: typeof d === 'string' ? d : d.device_id,
        }));
        setAvailableDevices(normalized);
      } catch (err) {
        console.error('Failed to fetch devices:', err);
        Alert.alert('Error', 'Failed to load available devices.');
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();
  }, []);

  const handleRegisterAppliance = async () => {
    if (!deviceId || !applianceName.trim() || !applianceType || !location) {
      Alert.alert('Error', 'Please fill out all fields before registering.');
      return;
    }

    try {
      const payload = {
        device_id: deviceId,
        appliance_name: applianceName, // ✅ align with backend
        appliance_type: applianceType, // ✅ align with backend
        location: location,
      };

      await api.post('/appliances', payload);

      Alert.alert('Success', 'Appliance registered successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setApplianceName('');
            setApplianceType('');
            setLocation('');
            setDeviceId('');
            onSuccess?.();
            // ❌ removed navigation.navigate("ConsumptionPage");
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error registering appliance:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.detail || 'Failed to register appliance.'
      );
    }
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
    <View style={styles.container}>
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Appliance Registration</Text>

        {/* Device ID */}
        <View style={styles.formField}>
          <Text style={styles.label}>Smart Plug ID</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setShowDeviceModal(true)}
          >
            <Text style={styles.dropdownText}>{deviceId || 'Select a device ID'}</Text>
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
            <Text style={styles.dropdownText}>{applianceType || 'Select appliance type'}</Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.formField}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setShowLocationModal(true)}
          >
            <Text style={styles.dropdownText}>{location || 'Select location'}</Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterAppliance}>
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
                  renderOption(item.device_id, setDeviceId, () => setShowDeviceModal(false))
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
                renderOption(item, setApplianceType, () => setShowTypeModal(false))
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
                renderOption(item, setLocation, () => setShowLocationModal(false))
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
    </View>
  );
};

export default RegisterAppliancePage;
