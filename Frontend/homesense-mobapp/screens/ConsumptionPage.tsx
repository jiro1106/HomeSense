import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  FlatList 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { styles } from './styles/ConsumptionPageStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

type ConsumptionPageNavProp = NativeStackNavigationProp<RootStackParamList, 'ConsumptionPage'>;

const timeRanges = ['Daily', 'Weekly', 'Monthly'];

// sample appliance data
const appliances = [
  { id: '1', name: 'Aircon 1', location: 'Bedroom', time: 'May 21, 07:34', status: 'ON', usage: '17 kWh' },
  { id: '2', name: 'Refrigerator', location: 'Kitchen', time: 'May 21, 09:23', status: 'ON', usage: '14.5 kWh' },
  { id: '3', name: 'Electric Fan 1', location: 'Living Room', time: 'May 21, 12:44', status: 'OFF', usage: '9 kWh' },
  { id: '4', name: 'Aircon 2', location: 'Living Room', time: 'May 21, 15:48', status: 'ON', usage: '8.5 kWh' },
];

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [selectedRange, setSelectedRange] = useState('Daily');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // filter state
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'individual'>('all');
  const [applianceDropdownVisible, setApplianceDropdownVisible] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<string | null>(null);

  // filtered data
  const filteredAppliances = filterType === 'all' 
    ? appliances 
    : appliances.filter(a => a.name === selectedAppliance);

  return (
    <View style={styles.container}>
      {/* ✅ Page Title */}
      <Text style={styles.pageTitle}>Appliance Records</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Time Range Dropdown */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
            <Text style={styles.dropdownText}>{selectedRange}</Text>
            <Icon name="arrow-drop-down" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Table button */}
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: viewType === 'table' ? '#000' : '#f1f1f1' }]}
          onPress={() => setViewType('table')}
        >
          <Icon name="table-chart" size={22} color={viewType === 'table' ? '#fff' : '#000'} />
          <Text style={[styles.toggleText, { color: viewType === 'table' ? '#fff' : '#000' }]}>Table</Text>
        </TouchableOpacity>

        {/* Chart button */}
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: viewType === 'chart' ? '#000' : '#f1f1f1' }]}
          onPress={() => setViewType('chart')}
        >
          <Icon name="bar-chart" size={22} color={viewType === 'chart' ? '#fff' : '#000'} />
          <Text style={[styles.toggleText, { color: viewType === 'chart' ? '#fff' : '#000' }]}>Chart</Text>
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterVisible(true)}>
          <Icon name="filter-list" size={17} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Time Range Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setDropdownVisible(false)}
          activeOpacity={1}
        >
          <View style={{
            marginHorizontal: 30,
            marginTop: 150,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            elevation: 5
          }}>
            <FlatList
              data={timeRanges}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedRange(item);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#000' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setFilterVisible(false)}
          activeOpacity={1}
        >
          <View style={{
            marginHorizontal: 30,
            marginTop: 200,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            elevation: 5
          }}>
            <TouchableOpacity 
              style={{ padding: 12 }}
              onPress={() => {
                setFilterType('all');
                setFilterVisible(false);
              }}
            >
              <Text style={{ fontSize: 16, color: '#000' }}>Show All Appliances</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ padding: 12 }}
              onPress={() => {
                setFilterType('individual');
                setSelectedAppliance(null);
                setFilterVisible(false);
              }}
            >
              <Text style={{ fontSize: 16, color: '#000' }}>Show Individual Appliance</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Show label or appliance dropdown depending on filter */}
        {filterType === 'all' ? (
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000' }}>
            All Appliances
          </Text>
        ) : (
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity 
              style={[styles.dropdownButton, { minWidth: 160 }]} 
              onPress={() => setApplianceDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedAppliance || 'Select Appliance'}
              </Text>
              <Icon name="arrow-drop-down" size={22} color="#000" />
            </TouchableOpacity>

            {/* Appliance Dropdown Modal */}
            <Modal visible={applianceDropdownVisible} transparent animationType="fade">
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
                onPress={() => setApplianceDropdownVisible(false)}
                activeOpacity={1}
              >
                <View style={{
                  marginHorizontal: 30,
                  marginTop: 200,
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  paddingVertical: 10,
                  elevation: 5
                }}>
                  <FlatList
                    data={appliances}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={{ padding: 12 }}
                        onPress={() => {
                          setSelectedAppliance(item.name);
                          setApplianceDropdownVisible(false);
                        }}
                      >
                        <Text style={{ fontSize: 16, color: '#000' }}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        )}

        {viewType === 'table' ? (
          <>
            {/* ✅ Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Appliance</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Location</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Time</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Status</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Usage</Text>
            </View>

            {/* ✅ Table Rows */}
            {filteredAppliances.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.location}</Text>
                <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.time}</Text>
                <Text style={[
                  styles.tableCell, 
                  styles.tableCellBorder, 
                  { color: item.status === 'ON' ? 'green' : 'red' }
                ]}>
                  {item.status}
                </Text>
                <Text style={styles.tableCell}>{item.usage}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Icon name="insert-chart" size={60} color="#aaa" />
            <Text style={{ color: '#aaa' }}>Chart View Placeholder</Text>
          </View>
        )}
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
