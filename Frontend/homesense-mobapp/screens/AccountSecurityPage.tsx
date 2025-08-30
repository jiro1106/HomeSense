import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StatusBar, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import styles from './styles/AccountSecurityStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AccountSecurityPage'>;

const AccountSecurityPage = () => {
  const navigation = useNavigation<NavProp>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');

  const [enableChangePass, setEnableChangePass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaveEnabled, setIsSaveEnabled] = useState(false);

  // ✅ Inline success messages
  const [usernameSuccessMsg, setUsernameSuccessMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await AsyncStorage.getItem('userData');
        if (data) {
          const user = JSON.parse(data);
          setUsername(user.username || '');
          setOriginalUsername(user.username || '');
          setEmail(user.email || '');
          setPassword(user.password || '');
        }
      } catch (error) {
        console.log('Error loading user data:', error);
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
  }, [username, originalUsername, enableChangePass, newPassword, confirmPassword]);

  const handleSave = async () => {
    if (enableChangePass) {
      if (!newPassword || !confirmPassword) {
        Alert.alert('Error', 'Please enter and confirm your new password.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }
    }

    try {
      const updatedUser = { 
        username, 
        email, 
        password: enableChangePass ? newPassword : password 
      };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      // ✅ Show success alerts + inline messages
      if (enableChangePass) {
        setPassword(newPassword);
        setEnableChangePass(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccessMsg('Password changed successfully.');
        setTimeout(() => setPasswordSuccessMsg(''), 4000);

        // ✅ NEW: Alert popup for password change
        Alert.alert("Success", "Password changed successfully.");
      }
      if (isEditingUsername) {
        setIsEditingUsername(false);
        setOriginalUsername(username);
        setUsernameSuccessMsg('Username changed successfully.');
        setTimeout(() => setUsernameSuccessMsg(''), 4000);

        // Optional alert for username change
        Alert.alert("Success", "Username changed successfully.");
      }

    } catch (error) {
      console.log(error);
    }
  };

  const handleEditUsername = () => {
    Alert.alert(
      'Edit Username',
      'Do you want to edit your username?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => setIsEditingUsername(true) }
      ]
    );
  };

  const handleCancelEditUsername = () => {
    setUsername(originalUsername);
    setIsEditingUsername(false);
  };

  const handleCancelChangePassword = () => {
    setEnableChangePass(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleEnableChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Are you sure you want to change your password?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => setEnableChangePass(true) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.topBarTitle}>Account & Security</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username */}
              <Text style={styles.label}>Username</Text>
              <View style={styles.rowInput}>
                <TextInput 
                  style={[
                    styles.input, 
                    { flex: 1 },
                    !isEditingUsername && styles.disabledInput
                  ]} 
                  value={username}
                  onChangeText={setUsername}
                  editable={isEditingUsername}
                />
                {!isEditingUsername ? (
                  <TouchableOpacity style={styles.editButton} onPress={handleEditUsername}>
                    <Icon name="edit" size={22} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.cancelButton2} onPress={handleCancelEditUsername}>
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
              />

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <TextInput 
                style={[styles.input, styles.disabledInput]} 
                value={password ? '********' : ''} 
                editable={false}
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
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput 
                      style={[styles.input, { flex: 1 }]} 
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton} 
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Icon 
                        name={showNewPassword ? 'visibility' : 'visibility-off'} 
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
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton} 
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Icon 
                        name={showConfirmPassword ? 'visibility' : 'visibility-off'} 
                        size={22} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={handleCancelChangePassword}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {passwordSuccessMsg ? (
                    <Text style={styles.successMessage}>{passwordSuccessMsg}</Text>
                  ) : null}
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  { backgroundColor: isSaveEnabled ? '#000' : '#ccc' }
                ]} 
                onPress={handleSave}
                disabled={!isSaveEnabled}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AccountSecurityPage;
