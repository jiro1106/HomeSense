import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
// @ts-ignore
import homesenseLogo from '../../assets/homesense-logo.png';

const LandingPage = () => {
  const handleGetStarted = () => {
    // Handle navigation to next screen
    console.log('Get Started clicked');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Logo with lightbulb icon */}
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

            {/* Get Started Button */}
            <TouchableOpacity 
              style={styles.getStartedBtn} 
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logoText: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Arial',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  getStartedBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    padding: 15,
    paddingHorizontal: 40,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 40,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LandingPage;
