import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
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
    'Other'
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
    'Other'
  ];

  // Generate ID once all inputs are filled
  useEffect(() => {
    if (applianceName.trim() && applianceType && location) {
      // Random simple ID generator
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

    Alert.alert(
      'Success',
      'Appliance registered successfully!',
      [
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
      ]
    );
  };

  const showTypePicker = () => {
    Alert.alert(
      'Select Appliance Type',
      '',
      applianceTypes.map(type => ({
        text: type,
        onPress: () => setApplianceType(type),
      }))
    );
  };

  const showLocationPicker = () => {
    Alert.alert(
      'Select Location',
      '',
      locations.map(loc => ({
        text: loc,
        onPress: () => setLocation(loc),
      }))
    );
  };

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
          <TouchableOpacity style={styles.dropdownContainer} onPress={showTypePicker}>
            <Text style={styles.dropdownText}>
              {applianceType || 'Select appliance type'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.formField}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity style={styles.dropdownContainer} onPress={showLocationPicker}>
            <Text style={styles.dropdownText}>
              {location || 'Select location'}
            </Text>
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
    </View>
  );
};

export default RegisterAppliancePage;
