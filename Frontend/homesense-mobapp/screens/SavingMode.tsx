import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import styles from './styles/SavingModeStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SavingMode'>;

const SavingMode = () => {
  const navigation = useNavigation<NavProp>();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  useEffect(() => {
    const loadMode = async () => {
      const savedMode = await AsyncStorage.getItem('savingMode');
      if (savedMode) setSelectedMode(savedMode);
    };
    loadMode();
  }, []);

  const handleSelectMode = async (mode: string) => {
    setSelectedMode(mode);
    await AsyncStorage.setItem('savingMode', mode);
    Alert.alert("Saved", `You selected ${mode} Saving Mode.`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saving Mode</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Instructions */}
          <Text style={styles.instructions}>
            Saving mode lets you choose how strict the system should be when giving 
            recommendations. The system looks at appliance consumption (kWh) and timestamps 
            to suggest ways to save. Choose Low, Medium, or High strictness:
          </Text>

          {/* Options */}
          <TouchableOpacity 
            style={[styles.optionButton, selectedMode === "Low" && styles.selectedOption]} 
            onPress={() => handleSelectMode("Low")}
          >
            <Text style={styles.optionText}>Low</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionButton, selectedMode === "Medium" && styles.selectedOption]} 
            onPress={() => handleSelectMode("Medium")}
          >
            <Text style={styles.optionText}>Medium</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionButton, selectedMode === "High" && styles.selectedOption]} 
            onPress={() => handleSelectMode("High")}
          >
            <Text style={styles.optionText}>High</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SavingMode;
