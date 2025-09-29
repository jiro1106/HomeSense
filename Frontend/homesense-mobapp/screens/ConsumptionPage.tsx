import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  FlatList, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { styles } from './styles/ConsumptionPageStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';
import { Swipeable } from 'react-native-gesture-handler';
import {
  LineChart,
  BarChart,
} from 'react-native-chart-kit';
type ConsumptionPageNavProp = NativeStackNavigationProp<RootStackParamList, 'ConsumptionPage'>;

const timeRanges = ['Daily', 'Weekly', 'Monthly'];

interface Appliance {
  device_id: string;
  appliance_name: string;
  appliance_type: string;
  location: string;
}

interface ApplianceData {
  device_id: string;
  name: string;
  location: string;
  time: string;
  status: string;
  usage: string;
}

const screenWidth = Dimensions.get("window").width;

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [selectedRange, setSelectedRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');

  // Modals
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [applianceDropdownVisible, setApplianceDropdownVisible] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<'all' | 'individual'>('all');
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);

  // Data
  const [appliances, setAppliances] = useState<ApplianceData[]>([]);
  const [registeredAppliances, setRegisteredAppliances] = useState<Appliance[]>([]);
  const [dailyStatus, setDailyStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch registered appliances
  const fetchRegisteredAppliances = async () => {
    try {
      const res = await api.get('/appliances');
      setRegisteredAppliances(res.data.appliances || []);
    } catch (err) {
      console.error('Failed to load appliances:', err);
      setRegisteredAppliances([]);
    }
  };

  // Fetch consumption data
  const fetchData = async () => {
    setLoading(true);
    try {
      const applianceList =
        filterType === 'all'
          ? registeredAppliances
          : selectedAppliance
          ? [selectedAppliance]
          : [];

      const requests = applianceList.map((appliance) => {
        let endpoint = '';
        if (selectedRange === 'Daily') endpoint = `/energy/daily/${appliance.device_id}`;
        else if (selectedRange === 'Weekly') endpoint = `/energy/weekly/${appliance.device_id}`;
        else if (selectedRange === 'Monthly') endpoint = `/energy/monthly/${appliance.device_id}`;
        return api.get(endpoint);
      });

      const responses = await Promise.all(requests);

      const allData: ApplianceData[] = [];
      responses.forEach((res, i) => {
        const appliance = applianceList[i];
        const dataArr = Array.isArray(res.data.history || res.data.data)
          ? res.data.history || res.data.data
          : [res.data];

        dataArr.forEach((d: any) => {
          allData.push({
            device_id: appliance.device_id,
            name: appliance?.appliance_name || 'Unknown',
            location: appliance?.location || 'Unknown',
            time: d.date || d.week_start || d.month || 'N/A',
            status: 'N/A',
            usage: d.total_kwh
              ? `${d.total_kwh} kWh`
              : d.kwh
              ? `${d.kwh} kWh`
              : 'N/A',
          });
        });
      });

      setAppliances(allData);

      // Fetch statuses if Daily
      if (selectedRange === 'Daily') {
        const statusRes = await api.get('/energy/summary');
        const statusMap: Record<string, string> = {};
        statusRes.data.summary.forEach((item: any) => {
          statusMap[item.device_id] =
            item.status.toLowerCase() === 'active' ? 'ON' : 'OFF';
        });
        setDailyStatus(statusMap);
      } else {
        setDailyStatus({});
      }
    } catch (error) {
      console.log('Error fetching appliance data:', error);
      setAppliances([]);
      setDailyStatus({});
    }
    setLoading(false);
  };

  const handleUnregister = async (device_id: string) => {
    Alert.alert(
      "Confirm Unregister",
      "Are you sure you want to unregister this appliance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unregister",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/appliances/${device_id}`);
              setRegisteredAppliances(prev => prev.filter(item => item.device_id !== device_id));
              setAppliances(prev => prev.filter(item => item.device_id !== device_id));
              Alert.alert("Success", "Appliance unregistered successfully");
            } catch (error) {
              console.error("Error unregistering appliance:", error);
              Alert.alert("Error", "Failed to unregister appliance");
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegisteredAppliances();
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRegisteredAppliances();
  }, []);

  useEffect(() => {
    if (registeredAppliances.length > 0) {
      fetchData();
    }
  }, [filterType, selectedAppliance, selectedRange, registeredAppliances]);

  const renderRightActions = (device_id: string) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
      }}
      onPress={() => handleUnregister(device_id)}
    >
      <Icon name="delete" size={24} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12 }}>Delete</Text>
    </TouchableOpacity>
  );

  //chart data
  const labels = appliances.map(item => filterType === 'all' ? item.name : item.time);
  const usageData = appliances.map(item => parseFloat(item.usage.replace(' kWh', '')) || 0);
  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Appliance Records</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={styles.dropdownText}>{selectedRange}</Text>
            <Icon name="arrow-drop-down" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: viewType === 'table' ? '#000' : '#f1f1f1' }]}
          onPress={() => setViewType('table')}
        >
          <Icon name="table-chart" size={22} color={viewType === 'table' ? '#fff' : '#000'} />
          <Text style={[styles.toggleText, { color: viewType === 'table' ? '#fff' : '#000' }]}>Table</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: viewType === 'chart' ? '#000' : '#f1f1f1' }]}
          onPress={() => setViewType('chart')}
        >
          <Icon name="bar-chart" size={22} color={viewType === 'chart' ? '#fff' : '#000'} />
          <Text style={[styles.toggleText, { color: viewType === 'chart' ? '#fff' : '#000' }]}>Chart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Icon name="filter-list" size={17} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Time Range Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setDropdownVisible(false)} />
          <View style={{
            position: 'absolute',
            top: 150,
            left: 30,
            right: 30,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            elevation: 5,
          }}>
            <FlatList
              data={timeRanges}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedRange(item as 'Daily' | 'Weekly' | 'Monthly');
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#000' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setFilterVisible(false)} />
          <View style={{
            position: 'absolute',
            top: 150,
            left: 30,
            right: 30,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            elevation: 5,
          }}>
            <TouchableOpacity style={{ padding: 12 }} onPress={() => { setFilterType('all'); setFilterVisible(false); }}>
              <Text style={{ fontSize: 16, color: '#000' }}>Show All Appliances</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12 }} onPress={() => { setFilterType('individual'); setSelectedAppliance(null); setFilterVisible(false); }}>
              <Text style={{ fontSize: 16, color: '#000' }}>Show Individual Appliance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Individual Appliance Dropdown Modal */}
      <Modal visible={applianceDropdownVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setApplianceDropdownVisible(false)} />
          <View style={{
            position: 'absolute',
            top: 200,
            left: 30,
            right: 30,
            backgroundColor: '#fff',
            borderRadius: 10,
            paddingVertical: 10,
            elevation: 5,
          }}>
            <FlatList
              data={registeredAppliances}
              keyExtractor={(item) => item.device_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedAppliance(item);
                    setApplianceDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#000' }}>{item.appliance_name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filterType === 'all' ? (
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#000' }}>All Appliances</Text>
        ) : (
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              style={[styles.dropdownButton, { minWidth: 160 }]}
              onPress={() => setApplianceDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedAppliance ? selectedAppliance.appliance_name : 'Select Appliance'}
              </Text>
              <Icon name="arrow-drop-down" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Table or Chart */}
        {viewType === 'table' ? (
          loading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Appliance</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Location</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Date</Text>
                {selectedRange === 'Daily' && (
                    <Text style={[styles.tableCell, styles.tableHeaderText2, styles.tableCellBorder, styles.statusCell]}>
                      Status
                    </Text>
                  )}

                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Usage</Text>
                </View>

                {appliances.map((item, index) => (
                  <Swipeable key={index} renderRightActions={() => renderRightActions(item.device_id)}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.name}</Text>
                      <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.location}</Text>
                      <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.time}</Text>

                      {/* Status only for Daily */}
                      {selectedRange === 'Daily' && (
                        <Text
                          style={[
                            styles.tableCell,
                            styles.tableCellBorder,
                            styles.statusCell,
                            { color: dailyStatus[item.device_id] === 'ON' ? 'green' : 'red' }
                          ]}
                        >
                          {dailyStatus[item.device_id] || 'OFF'}
                        </Text>
                      )}

                      <Text style={styles.tableCell}>{item.usage}</Text>
                    </View>
                  </Swipeable>
                ))}
            </>
          )
        ) : (
           <View style={{ marginTop: 20 }}>
            {filterType === 'all' ? (
              <BarChart
                data={{
                  labels: labels,
                  datasets: [{ data: usageData }]
                }}
                width={screenWidth - 30}
                height={300}
                yAxisLabel=""      // 👈 add this
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                style={{ borderRadius: 12 }}
              />
            ) : (
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: usageData }]
                }}
                width={screenWidth - 30}
                height={300}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                bezier
                style={{ borderRadius: 12 }}
              />
            )}
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
