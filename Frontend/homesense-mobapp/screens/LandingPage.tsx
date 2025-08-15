import React from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { styles } from './styles/LandingPageStyles';
// @ts-ignore
import homesenseLogo from '../assets/homesenseLogo.png';

type LandingPageNavProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type Props = {
  navigation: LandingPageNavProp;
};

const LandingPage: React.FC<Props> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>H</Text>
                <Image 
                  source={homesenseLogo} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>meSense</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.getStartedBtn} 
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

export default LandingPage;
