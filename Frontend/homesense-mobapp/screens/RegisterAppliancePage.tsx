import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { styles } from './styles/RegisterAppliancePageStyles';

interface RegisterAppliancePageProps {
  navigation: any;
  onSuccess?: () => void;
}

const RegisterAppliancePage: React.FC<RegisterAppliancePageProps> = ({ navigation, onSuccess }) => {
  const [applianceName, setApplianceName] = useState('Jiro Electric Fan');
  const [applianceType, setApplianceType] = useState('Electric Fan');
  const [location, setLocation] = useState('Bedroom');
  const [applianceId] = useState('39820jwjkj10237df27382379h');

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

  const handleRegisterAppliance = () => {
    if (!applianceName.trim()) {
      Alert.alert('Error', 'Please enter an appliance name');
      return;
    }

    // Here you would typically send the data to your backend
    console.log('Registering appliance:', {
      name: applianceName,
      type: applianceType,
      location: location,
      id: applianceId
    });

    Alert.alert(
      'Success',
      'Appliance registered successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            // Reset form and go back to home
            setApplianceName('');
            setApplianceType('Electric Fan');
            setLocation('Bedroom');
            // Call the success callback to go back to home
            onSuccess?.();
          }
        }
      ]
    );
  };

  const showTypePicker = () => {
    Alert.alert(
      'Select Appliance Type',
      '',
      applianceTypes.map(type => ({
        text: type,
        onPress: () => setApplianceType(type)
      }))
    );
  };

  const showLocationPicker = () => {
    Alert.alert(
      'Select Location',
      '',
      locations.map(loc => ({
        text: loc,
        onPress: () => setLocation(loc)
      }))
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
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
            <Text style={styles.dropdownText}>{applianceType}</Text>
            <Image
              source={require('../assets/icon.png')}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.formField}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity style={styles.dropdownContainer} onPress={showLocationPicker}>
            <Text style={styles.dropdownText}>{location}</Text>
            <Image
              source={require('../assets/icon.png')}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

        {/* ID */}
        <View style={styles.formField}>
          <Text style={styles.label}>ID</Text>
          <TextInput
            style={styles.readOnlyInput}
            value={applianceId}
            editable={false}
            selectTextOnFocus={false}
          />
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterAppliance}>
          <Text style={styles.registerButtonText}>Register Appliance</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default RegisterAppliancePage;
