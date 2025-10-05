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
const sortOptions = ['Date', 'Appliance'];

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
  week_start?: string;
  week_end?: string;
  timestamp?: string;
}

const screenWidth = Dimensions.get("window").width;

const ConsumptionPage = () => {
  const navigation = useNavigation<ConsumptionPageNavProp>();
  const [selectedRange, setSelectedRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [sortBy, setSortBy] = useState<'Date' | 'Appliance'>('Date');

  // Modals
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [applianceDropdownVisible, setApplianceDropdownVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<'all' | 'individual'>('all');
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);

  // Data
  const [appliances, setAppliances] = useState<ApplianceData[]>([]);
  const [registeredAppliances, setRegisteredAppliances] = useState<Appliance[]>([]);
  const [dailyStatus, setDailyStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{time: string; location: string; usage: string; name: string; week_start?: string; week_end?: string} | null>(null);
  
  // Total usage state
  const [totalUsage, setTotalUsage] = useState<string>('0 kWh');
  const [loadingTotal, setLoadingTotal] = useState(false);

  // Helper function to format week range
  const formatWeekRange = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  // Helper function to get week range from week_start
  const getWeekRange = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  // Sort appliances data
  const sortAppliancesData = (data: ApplianceData[]) => {
    const sortedData = [...data];
    
    if (sortBy === 'Date') {
      return sortedData.sort((a, b) => {
        const timeA = a.timestamp || a.time;
        const timeB = b.timestamp || b.time;
        return timeB.localeCompare(timeA);
      });
    } else if (sortBy === 'Appliance') {
      return sortedData.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return sortedData;
  };

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

  // Fetch total usage
  const fetchTotalUsage = async () => {
    setLoadingTotal(true);
    try {
      let endpoint = '';
      
      if (filterType === 'all') {
        // Total for all appliances
        if (selectedRange === 'Daily') {
          endpoint = '/energy/daily/total';
        } else if (selectedRange === 'Weekly') {
          endpoint = '/energy/weekly/total?limit=1';
        } else if (selectedRange === 'Monthly') {
          endpoint = '/energy/monthly/total?limit=1';
        }
      } else if (selectedAppliance) {
        // Total for individual appliance
        if (selectedRange === 'Daily') {
          endpoint = `/energy/daily/${selectedAppliance.device_id}`;
        } else if (selectedRange === 'Weekly') {
          endpoint = `/energy/weekly/${selectedAppliance.device_id}?limit=1`;
        } else if (selectedRange === 'Monthly') {
          endpoint = `/energy/monthly/${selectedAppliance.device_id}?limit=1`;
        }
      }

      if (endpoint) {
        const res = await api.get(endpoint);
        console.log('Total Usage Response:', res.data); // Debug log
        
        // Parse response based on endpoint type
        let total = 0;
        if (filterType === 'all') {
          if (selectedRange === 'Daily') {
            // Response: { total_kwh: number, ... }
            total = typeof res.data.total_kwh === 'number' ? res.data.total_kwh : parseFloat(res.data.total_kwh) || 0;
          } else if (selectedRange === 'Weekly') {
            // Response: { data: [{ week_start, week_end, weekly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total = typeof data[0].weekly_total_kwh === 'number' 
                ? data[0].weekly_total_kwh 
                : parseFloat(data[0].weekly_total_kwh) || 0;
            }
          } else if (selectedRange === 'Monthly') {
            // Response: { data: [{ month, monthly_total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total = typeof data[0].monthly_total_kwh === 'number' 
                ? data[0].monthly_total_kwh 
                : parseFloat(data[0].monthly_total_kwh) || 0;
            }
          }
        } else {
          // Individual appliance
          if (selectedRange === 'Daily') {
            // Response: { total_kwh: number, ... }
            total = typeof res.data.total_kwh === 'number' ? res.data.total_kwh : parseFloat(res.data.total_kwh) || 0;
          } else if (selectedRange === 'Weekly' || selectedRange === 'Monthly') {
            // Response: { data: [{ total_kwh }] }
            const data = res.data.data || [];
            if (data.length > 0) {
              total = typeof data[0].total_kwh === 'number' 
                ? data[0].total_kwh 
                : parseFloat(data[0].total_kwh) || 0;
            }
          }
        }
        
        console.log('Parsed Total:', total); // Debug log
        setTotalUsage(`${total.toFixed(6)} kWh`);
      } else {
        setTotalUsage('0 kWh');
      }
    } catch (error) {
      console.log('Error fetching total usage:', error);
      setTotalUsage('0 kWh');
    }
    setLoadingTotal(false);
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
        else if (selectedRange === 'Weekly') endpoint = `/energy/weekly/${appliance.device_id}?limit=2`;
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
          let timeDisplay = '';
          let week_start = '';
          let week_end = '';
          let timestamp = '';

          if (selectedRange === 'Weekly' && d.week_start) {
            const weekRange = getWeekRange(d.week_start);
            timeDisplay = `${weekRange.start} to ${weekRange.end}`;
            week_start = weekRange.start;
            week_end = weekRange.end;
            timestamp = weekRange.start;
          } else {
            timeDisplay = d.date || d.week_start || d.month || 'N/A';
            timestamp = d.date || d.week_start || d.month || '';
          }

          allData.push({
            device_id: appliance.device_id,
            name: appliance?.appliance_name || 'Unknown',
            location: appliance?.location || 'Unknown',
            time: timeDisplay,
            status: 'N/A',
            usage: d.total_kwh
              ? `${d.total_kwh} kWh`
              : d.kwh
              ? `${d.kwh} kWh`
              : '0 kWh',
            week_start: week_start,
            week_end: week_end,
            timestamp: timestamp
          });
        });
      });

      // Sort the data based on current sort selection
      const sortedData = sortAppliancesData(allData);
      setAppliances(sortedData);

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
    await fetchTotalUsage();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRegisteredAppliances();
  }, []);

  useEffect(() => {
    if (registeredAppliances.length > 0) {
      fetchData();
      fetchTotalUsage();
    }
  }, [filterType, selectedAppliance, selectedRange, registeredAppliances, sortBy]);

  const renderRightActions = (device_id: string) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
      }}
      onPress={() => handleUnregister(device_id)}
    >
      <Icon name="delete" size={24} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12 }}>Delete</Text>
    </TouchableOpacity>
  );

  // Chart data and handlers
  const handleChartItemPress = (index: number) => {
    if (appliances[index]) {
      const appliance = appliances[index];
      setSelectedDataPoint({
        time: appliance.time,
        location: appliance.location,
        usage: appliance.usage,
        name: appliance.name,
        week_start: appliance.week_start,
        week_end: appliance.week_end
      });
    }
  };

  // Close data summary
  const handleCloseDataSummary = () => {
    setSelectedDataPoint(null);
  };

  // Prepare chart data with proper handling for zero values
  const getChartData = () => {
    // Ensure we always have valid numeric values, default to 0 if invalid
    const usageData = appliances.map(item => {
      const usageValue = parseFloat(item.usage.replace(' kWh', ''));
      return isNaN(usageValue) ? 0 : usageValue;
    });

    const labels = appliances.map(item => 
      filterType === 'all'
        ? item.name.length > 8 ? item.name.slice(0, 8) + '…' : item.name
        : selectedRange === 'Weekly' && item.week_start 
          ? item.time.split(' to ')[0] // Show only start date for chart labels to avoid clutter
          : item.time
    );

    // If no data, create a default chart with zero values
    if (appliances.length === 0) {
      if (filterType === 'all') {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      } else {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }
    }

    return {
      labels: labels,
      datasets: [{ data: usageData }]
    };
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#000'
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: 'rgba(0, 0, 0, 0.2)',
      strokeDasharray: '0'
    },
    propsForLabels: {
      fontSize: 10
    }
  };

  // Custom chart component with touch handling and usage labels
  const renderChartWithTouch = () => {
    const chartData = getChartData();
    
    if (filterType === 'all') {
      return (
        <View>
          <BarChart
            data={chartData}
            width={screenWidth - 30}
            height={300}
            yAxisLabel=""
            yAxisSuffix=" kWh"
            chartConfig={chartConfig}
            style={{ borderRadius: 12, marginBottom: 40 }}
            fromZero
            showValuesOnTopOfBars
            withHorizontalLabels={true}
            withVerticalLabels={true}
          />
          {/* Touchable overlays for each bar */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' }}>
            {chartData.datasets[0].data.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={{ 
                  flex: 1, 
                  height: 300,
                  marginHorizontal: 2,
                  backgroundColor: 'transparent'
                }}
                onPress={() => handleChartItemPress(index)}
              />
            ))}
          </View>
        </View>
      );
    } else {
      return (
        <View>
          <LineChart
            data={chartData}
            width={screenWidth - 30}
            height={320}
            yAxisLabel=""
            yAxisSuffix=" kWh"
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 12, marginBottom: 40 }}
            fromZero
            withHorizontalLabels={true}
            withVerticalLabels={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            decorator={() => {
              return (
                <View>
                  {chartData.datasets[0].data.map((value, index) => {
                    if (appliances[index]) {
                      // Calculate x position for the dot
                      const xPosition = (index * (screenWidth - 250)) / (chartData.labels.length - 1) + 97;
                      
                      // Calculate y position for the dot (inverted because chart coordinates start from top)
                      const maxDataValue = Math.max(...chartData.datasets[0].data);
                      const chartHeight = 250; // Approximate chart drawing area height
                      const paddingTop = 50; // Approximate top padding of chart
                      
                      let yPosition;
                      if (maxDataValue === 0) {
                        yPosition = paddingTop + chartHeight - 10; // Bottom of chart for zero values
                      } else {
                        yPosition = paddingTop + chartHeight - (value * chartHeight / maxDataValue);
                      }
                      
                      // Adjust y position for label placement (above the dot)
                      const labelYPosition = yPosition - 63;
                      
                      // Get the full usage value from the original data
                      const fullUsage = appliances[index].usage;
                      
                      return (
                        <View
                          key={index}
                          style={{
                            position: 'absolute',
                            left: xPosition - 25,
                            top: labelYPosition,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                            borderRadius: 4,
                            minWidth: 50,
                            alignItems: 'center',
                            zIndex: 1000,
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                            {fullUsage}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              );
            }}
          />
          {/* Touchable overlays for data points */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around' }}>
            {chartData.datasets[0].data.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={{ 
                  flex: 1, 
                  height: 320,
                  marginHorizontal: 2,
                  backgroundColor: 'transparent'
                }}
                onPress={() => handleChartItemPress(index)}
              />
            ))}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Appliance Records</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Time Range and Sort Column */}
        <View style={styles.timeSortColumn}>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>{selectedRange}</Text>
              <Icon name="arrow-drop-down" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortDropdownVisible(true)}
          >
            <Icon name="swap-vert" size={17} color="#000" />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
          </View>
          
          
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

      {/* Sort Dropdown Modal */}
      <Modal visible={sortDropdownVisible} transparent animationType="fade">
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setSortDropdownVisible(false)} />
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
              data={sortOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSortBy(item as 'Date' | 'Appliance');
                    setSortDropdownVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#000' }}>Sort by {item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
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

        {/* Selected Data Point Info */}
        {viewType === 'chart' && selectedDataPoint && (
          <View style={[styles.dataPointStyle]}>
            {/* Close Button */}
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={handleCloseDataSummary}
            >
              <Icon name="close" size={18} color="#000" />
            </TouchableOpacity>
            
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000', marginRight: 30 }}>
              Data Summary:
            </Text>
            {filterType === 'all' && (
              <Text style={{ fontSize: 12, color: '#000' }}>
                Appliance: {selectedDataPoint.name}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: '#000' }}>
              {selectedRange === 'Weekly' && selectedDataPoint.week_start && selectedDataPoint.week_end
                ? `Week: ${selectedDataPoint.week_start} to ${selectedDataPoint.week_end}`
                : `Date: ${selectedDataPoint.time}`}
            </Text>
            <Text style={{ fontSize: 12, color: '#000' }}>
              Location: {selectedDataPoint.location}
            </Text>
            <Text style={{ fontSize: 12, color: '#000' }}>
              Usage: {selectedDataPoint.usage}
            </Text>
          </View>
        )}

        {/* Table or Chart */}
        {viewType === 'table' ? (
          loading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
          ) : (
            <>
              {/* Table with grid lines */}
              <View style={[styles.tableHeader, { borderBottomWidth: 1, borderBottomColor: '#ddd' }]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Appliance</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Location</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>
                  {selectedRange === 'Weekly' ? 'Week Range' : 'Date'}
                </Text>
                {selectedRange === 'Daily' && (
                  <Text style={[styles.tableCell, styles.tableHeaderText2, styles.tableCellBorder, styles.statusCell]}>
                    Status
                  </Text>
                )}
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Usage</Text>
              </View>

              {sortAppliancesData(appliances).map((item, index) => (
                <Swipeable key={index} renderRightActions={() => renderRightActions(item.device_id)}>
                  <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: '#eee' }]}>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.name}</Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder]}>{item.location}</Text>
                    <Text style={[styles.tableCell, styles.tableCellBorder, { fontSize: 12 }]}>{item.time}</Text>

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
            {renderChartWithTouch()}
          </View>
        )}

        {/* Total Usage Section */}
        <View style={{
          marginTop: 30,
          marginBottom: 20,
          padding: 20,
          backgroundColor: '#f8f8f8',
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#000',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                {filterType === 'all' 
                  ? `Total ${selectedRange} Consumption (All Appliances)` 
                  : `Total ${selectedRange} Consumption${selectedAppliance ? ` (${selectedAppliance.appliance_name})` : ''}`
                }
              </Text>
              {loadingTotal ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#000' }}>
                  {totalUsage}
                </Text>
              )}
            </View>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#000',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="bolt" size={32} color="#FFD700" />
            </View>
          </View>
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