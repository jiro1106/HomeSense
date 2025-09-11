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
} from 'react-native';
import { styles } from './styles/RegisterAppliancePageStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RegisterAppliancePageProps {
  navigation: any;
  onSuccess?: () => void;
}

const RegisterAppliancePage: React.FC<RegisterAppliancePageProps> = ({ navigation, onSuccess }) => {
  const [applianceName, setApplianceName] = useState('');
  const [applianceType, setApplianceType] = useState('');
  const [location, setLocation] = useState('');
  const [applianceId, setApplianceId] = useState('');

  // modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

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

  // Generate ID once all inputs are filled
  useEffect(() => {
    if (applianceName.trim() && applianceType && location) {
      const newId = Math.random().toString(36).substring(2, 12);
      setApplianceId(newId);
    } else {
      setApplianceId('');
    }
  }, [applianceName, applianceType, location]);

  const handleRegisterAppliance = () => {
    if (!applianceName.trim() || !applianceType || !location) {
      Alert.alert('Error', 'Please fill out all fields before registering.');
      return;
    }

    console.log('Registering appliance:', {
      name: applianceName,
      type: applianceType,
      location: location,
      id: applianceId,
    });

    Alert.alert('Success', 'Appliance registered successfully!', [
      {
        text: 'OK',
        onPress: () => {
          setApplianceName('');
          setApplianceType('');
          setLocation('');
          setApplianceId('');
          onSuccess?.();
        },
      },
    ]);
  };

  const renderOption = (item: string, onSelect: (val: string) => void, close: () => void) => (
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
          <TouchableOpacity style={styles.dropdownContainer} onPress={() => setShowTypeModal(true)}>
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

        {/* ID (only show if available) */}
        {applianceId ? (
          <View style={styles.formField}>
            <Text style={styles.label}>ID</Text>
            <TextInput
              style={styles.readOnlyInput}
              value={applianceId}
              editable={false}
              selectTextOnFocus={false}
            />
          </View>
        ) : null}

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterAppliance}>
          <Text style={styles.registerButtonText}>Register Appliance</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Appliance Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Appliance Type</Text>
            <FlatList
              data={applianceTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => renderOption(item, setApplianceType, () => setShowTypeModal(false))}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowTypeModal(false)}>
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
              renderItem={({ item }) => renderOption(item, setLocation, () => setShowLocationModal(false))}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowLocationModal(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RegisterAppliancePage;
