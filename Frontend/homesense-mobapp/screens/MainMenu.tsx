import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type MainMenuNavProp = NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;

const MainMenu = () => {
  const navigation = useNavigation<MainMenuNavProp>();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    navigation.replace('Login'); // replaces stack so user can't go back to MainMenu
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Main Menu 🎉</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainMenu;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16 }
});
