import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { styles } from './styles/RecoStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Recommendations'>;

const Recommendations = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />


      {/* Page Title */}
      <Text style={styles.pageTitle}>Energy-Saving Recommendations</Text>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Usage */}
        <View style={styles.usageCard}>
          <Icon name="eco" size={28} color="#4CAF50" />
          <View style={styles.usageTextContainer}>
            <Text style={styles.usageValue}>This Week’s Usage</Text>
            <Text style={styles.usageKwh}>54.6 kWh</Text>
            <Text style={styles.usageNote}>You saved 12% more energy this week!</Text>
          </View>
        </View>

        {/* Recommendations */}
        <Text style={styles.sectionTitle}>Recommendations</Text>

        {/* Washing Machine */}
        <View style={styles.recommendItem}>
          <View style={[styles.recommendIcon, { backgroundColor: '#B2FFB2' }]}>
            <Icon name="local-laundry-service" size={20} color="#4CAF50" />
          </View>
          <View style={styles.recommendTextContainer}>
            <Text style={styles.recommendTitle}>Washing Machine Timing</Text>
            <Text style={styles.recommendDesc}>
              Your usage patterns show frequent operation during peak hours. Shifting laundry
              loads to off-peak hours could reduce your overall consumption.
            </Text>
          </View>
        </View>

        {/* Air Conditioner */}
        <View style={styles.recommendItem}>
          <View style={[styles.recommendIcon, { backgroundColor: '#ADD8E6' }]}>
            <Icon name="ac-unit" size={20} color="#2196F3" />
          </View>
          <View style={styles.recommendTextContainer}>
            <Text style={styles.recommendTitle}>Air Conditioner Usage</Text>
            <Text style={styles.recommendDesc}>
              Your air conditioner consumes more electricity than the average in your group.
              Consider reducing its usage during peak hours or setting a timer to automatically
              turn it off at night.
            </Text>
          </View>
        </View>

        {/* Refrigerator */}
        <View style={styles.recommendItem}>
          <View style={[styles.recommendIcon, { backgroundColor: '#FFB6C1' }]}>
            <Icon name="kitchen" size={20} color="#E91E63" />
          </View>
          <View style={styles.recommendTextContainer}>
            <Text style={styles.recommendTitle}>Refrigerator Efficiency</Text>
            <Text style={styles.recommendDesc}>
              Your refrigerator’s consumption is consistently higher than similar households.
              Check if the door seals are worn out or consider upgrading to a more
              energy-efficient model.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
        <SafeAreaView style={styles.bottomNavContainer} edges={['bottom']}>
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainMenu')}>
                <Icon name="home" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ConsumptionPage')}>
                <Icon name="description" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.fab}>
                <Icon name="add" size={30} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Bills')}>
                <Icon name="attach-money" size={24} color="#fff" />
                </TouchableOpacity>

                {/* ✅ Flash icon now routes to Recommendations and is highlighted */}
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Recommendations')}>
                <Icon name="flash-on" size={24} color="#FFD700" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    </View>
  );
};

export default Recommendations;
