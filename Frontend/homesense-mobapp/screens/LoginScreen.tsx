import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StatusBar,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles/LoginStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both fields.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) {
        Alert.alert('Error', 'No account found. Please sign up first.');
        return;
      }

      const user = JSON.parse(storedUser);
      if (user.email === email && user.password === password) {
        await AsyncStorage.setItem('userData', JSON.stringify(user)); // refresh session
        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => navigation.replace('MainMenu') } // 👈 Redirect
        ]);
      } else {
        Alert.alert('Error', 'Incorrect email or password.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Image source={require('../assets/homesenseLogo.png')} style={styles.logoIcon} />
            <Text style={styles.logoText}>meSense</Text>
          </View>
        </View>

        {/* Login Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Login</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signUpLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Password + Eye Icon */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons
                name={secureText ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* Remember me & Forgot password */}
          <View style={styles.row}>
            <View style={styles.rememberMeContainer}>
              <View style={{
                width: 18, height: 18, borderWidth: 1, borderColor: '#ccc', borderRadius: 3
              }} />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot Password ?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
