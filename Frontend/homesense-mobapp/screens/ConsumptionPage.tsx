import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { styles } from './styles/ConsumptionPageStyles';

type ConsumptionPageNavProp = NativeStackNavigationProp<RootStackParamList, 'ConsumptionPage'>;

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [timeRange] = useState('Daily');
  const [viewMode, setViewMode] = useState<'Table' | 'Chart'>('Chart');
  const [applianceFilter] = useState('All Appliances');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>Appliance Records</Text>
          <TouchableOpacity onPress={() => navigation.replace('SettingsPage')}>
            <Icon name="settings" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>{timeRange}</Text>
            <Icon name="keyboard-arrow-down" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.viewToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, viewMode === 'Table' && styles.toggleButtonActive]}
              onPress={() => setViewMode('Table')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'Table' && styles.toggleButtonTextActive]}>
                Table
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, viewMode === 'Chart' && styles.toggleButtonActive]}
              onPress={() => setViewMode('Chart')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'Chart' && styles.toggleButtonTextActive]}>
                Chart
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Appliance Filter */}
        <TouchableOpacity style={styles.applianceFilter}>
          <Text style={styles.applianceFilterText}>{applianceFilter}</Text>
          <Icon name="keyboard-arrow-down" size={20} color="#666" />
        </TouchableOpacity>

        {/* Chart Container */}
        <View style={styles.chartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            {[25, 20, 15, 10, 5, 0].map((value) => (
              <Text key={value} style={styles.yAxisLabel}>
                {value}
              </Text>
            ))}
          </View>

          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View 
                key={index} 
                style={[
                  styles.gridLine, 
                  { top: (index / 5) * 200 }
                ]} 
              />
            ))}

            {/* Chart line and data points */}
            <View style={styles.chartLine}>
              {[
                { name: 'Aircon 1', consumption: 17.5, x: 50 },
                { name: 'Refrigerator', consumption: 14.5, x: 150 },
                { name: 'Electric Fan 1', consumption: 9, x: 250 },
                { name: 'Aircon 2', consumption: 8.5, x: 350 },
              ].map((data, index, arr) => {
                const maxConsumption = 25;
                const chartHeight = 200;
                const getY = (c: number) => chartHeight - (c / maxConsumption) * chartHeight;
                return (
                  <View key={data.name}>
                    <View style={[styles.dataPoint, { left: data.x - 5, top: getY(data.consumption) - 5 }]} />
                    {index < arr.length - 1 && (
                      <View
                        style={[
                          styles.lineSegment,
                          {
                            left: data.x,
                            top: getY(data.consumption),
                            width: arr[index + 1].x - data.x,
                            height: 2,
                            transform: [{
                              rotate: `${
                                (Math.atan2(
                                  getY(arr[index + 1].consumption) - getY(data.consumption),
                                  arr[index + 1].x - data.x
                                ) * 180) / Math.PI
                              }deg`,
                            }],
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* X-axis labels */}
            <View style={styles.xAxis}>
              {[
                { name: 'Aircon 1', x: 50 },
                { name: 'Refrigerator', x: 150 },
                { name: 'Electric Fan 1', x: 250 },
                { name: 'Aircon 2', x: 350 },
              ].map((data) => (
                <Text key={data.name} style={[styles.xAxisLabel, { left: data.x - 30 }]}>
                  {data.name}
                </Text>
              ))}
            </View>
          </View>

          {/* Y-axis title */}
          <Text style={styles.yAxisTitle}>kWh</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <SafeAreaView style={styles.bottomNavContainer} edges={['bottom']}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.replace('MainMenu')}>
            <Icon name="home" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="description" size={24} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab}>
            <Icon name="add" size={30} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="attach-money" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Icon name="flash-on" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ConsumptionPage;
