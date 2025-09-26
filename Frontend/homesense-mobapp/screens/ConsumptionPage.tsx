import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { styles } from './styles/ConsumptionPageStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api'; // ✅ use api.ts

type ConsumptionPageNavProp = NativeStackNavigationProp<RootStackParamList, 'ConsumptionPage'>;

const timeRanges = ['Daily', 'Weekly', 'Monthly'];
const deviceNames = ['plug_1', 'plug_2', 'plug_3']; // for individual appliance filter

interface ApplianceData {
  device_name: string;
  time: string;
  status: string; // only for daily
  usage: string;
}

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [selectedRange, setSelectedRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // filter state
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'individual'>('all');
  const [applianceDropdownVisible, setApplianceDropdownVisible] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<string | null>(null);

  // data
  const [appliances, setAppliances] = useState<ApplianceData[]>([]);
  const [dailyStatus, setDailyStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // fetch appliance usage
  const fetchData = async () => {
    setLoading(true);
    try {
      const applianceList = filterType === 'all' ? deviceNames : selectedAppliance ? [selectedAppliance] : [];
      const requests = applianceList.map((device) => {
        let endpoint = '';
        if (selectedRange === 'Daily') endpoint = `/energy/daily/${device}`;
        else if (selectedRange === 'Weekly') endpoint = `/energy/weekly/${device}`;
        else if (selectedRange === 'Monthly') endpoint = `/energy/monthly/${device}`;
        return api.get(endpoint);
      });

      const responses = await Promise.all(requests);

      const allData: ApplianceData[] = [];
      responses.forEach((res, i) => {
        const device = applianceList[i];
        const dataArr = Array.isArray(res.data.history || res.data.data) ? res.data.history || res.data.data : [res.data];

        dataArr.forEach((d: any) => {
          allData.push({
            device_name: device,
            time: d.date || d.week_start || d.month || 'N/A',
            status: 'N/A', // placeholder, will be replaced for Daily
            usage: d.total_kwh ? `${d.total_kwh} kWh` : 'N/A',
          });
        });
      });

      setAppliances(allData);

      // fetch daily status only if selectedRange is Daily
      if (selectedRange === 'Daily') {
        const summaryRes = await api.get('/energy/summary');
        const statusMap: Record<string, string> = {};
        summaryRes.data.summary.forEach((item: any) => {
          // map your backend status to ON/OFF
          statusMap[item.device_name] = item.status.toLowerCase() === 'active' ? 'ON' : 'OFF';
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

  useEffect(() => {
    fetchData();
  }, [filterType, selectedAppliance, selectedRange]);

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Appliance Records</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
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
                    setSelectedRange(item as 'Daily' | 'Weekly' | 'Monthly');
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
                    data={deviceNames}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={{ padding: 12 }}
                        onPress={() => {
                          setSelectedAppliance(item);
                          setApplianceDropdownVisible(false);
                        }}
                      >
                        <Text style={{ fontSize: 16, color: '#000' }}>{item}</Text>
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
            {loading ? (
              <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Appliance</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Location</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Time</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Status</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Usage</Text>
                </View>

                {appliances.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.device_name}</Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>N/A</Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.time}</Text>
                    <Text style={[
                      styles.tableCell,
                      styles.tableCellBorder,
                      { color: selectedRange === 'Daily' && dailyStatus[item.device_name] === 'ON' ? 'green' : 'red' }
                    ]}>
                      {selectedRange === 'Daily' ? dailyStatus[item.device_name] || 'OFF' : 'N/A'}
                    </Text>
                    <Text style={styles.tableCell}>{item.usage}</Text>
                  </View>
                ))}
              </>
            )}
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
