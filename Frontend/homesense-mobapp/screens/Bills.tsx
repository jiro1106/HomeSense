import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { styles } from './styles/BillsStyles';
import { predictPrice } from '../utils/api';

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const Bills = () => {
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Form inputs
  const [lotNo, setLotNo] = useState('1');
  const [area, setArea] = useState('150');
  const [age, setAge] = useState('5');
  const [distance, setDistance] = useState('2');
  
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  const onPredict = async () => {
    setLoading(true);
    try {
      const result = await predictPrice({
        lot_no: Number(lotNo),
        area: Number(area),
        age: Number(age),
        distance: Number(distance),
      });
      
      setPrediction(result.predicted_price);
      setResultVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>House Price Prediction</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
            <Text style={styles.dropdownText}>{selectedMonth}</Text>
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

        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-list" size={17} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Month Dropdown Modal */}
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
              data={months}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedMonth(item);
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Prediction Form */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#000' }}>
            Test Price Prediction
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 0.48 }}>
              <Text style={{ color: '#000', marginBottom: 6 }}>Lot No.</Text>
              <TextInput
                keyboardType="numeric"
                value={lotNo}
                onChangeText={setLotNo}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#000' }}
                placeholder="e.g. 1"
                placeholderTextColor="#999"
              />
            </View>
            <View style={{ flex: 0.48 }}>
              <Text style={{ color: '#000', marginBottom: 6 }}>Area (sqm)</Text>
              <TextInput
                keyboardType="numeric"
                value={area}
                onChangeText={setArea}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#000' }}
                placeholder="e.g. 150"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 0.48 }}>
              <Text style={{ color: '#000', marginBottom: 6 }}>Age (years)</Text>
              <TextInput
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#000' }}
                placeholder="e.g. 5"
                placeholderTextColor="#999"
              />
            </View>
            <View style={{ flex: 0.48 }}>
              <Text style={{ color: '#000', marginBottom: 6 }}>Distance (km)</Text>
              <TextInput
                keyboardType="numeric"
                value={distance}
                onChangeText={setDistance}
                style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, color: '#000' }}
                placeholder="e.g. 2"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            onPress={onPredict}
            disabled={loading}
            style={{ backgroundColor: loading ? '#ccc' : '#000', borderRadius: 8, padding: 12, alignItems: 'center' }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Predict</Text>}
          </TouchableOpacity>

          {prediction !== null && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#000' }}>Predicted Price:</Text>
              <Text style={{ color: '#000', fontSize: 20, fontWeight: '700' }}>₱{prediction.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Your existing table/chart code */}
        {viewType === 'table' ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Week</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Electricity Rate</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Weekly Energy Consumption</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Bill Estimation</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>1</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>10.5</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>8.5 kWh</Text>
              <Text style={styles.tableCell}>₱600.23</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>2</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>10.7</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>9 kWh</Text>
              <Text style={styles.tableCell}>₱652.53</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>3</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>10.2</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>14.5 kWh</Text>
              <Text style={styles.tableCell}>₱834.43</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>4</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>10.1</Text>
              <Text style={[styles.tableCell, styles.tableCellBorder]}>17 kWh</Text>
              <Text style={styles.tableCell}>₱326.54</Text>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>
                Total: <Text style={styles.totalAmount}>₱2,413.73</Text>
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Icon name="insert-chart" size={60} color="#aaa" />
            <Text style={{ color: '#aaa' }}>Chart View Placeholder</Text>
          </View>
        )}

        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Estimated Bill for {selectedMonth}</Text>
          <Text style={styles.highlightAmount}>₱2,413.73</Text>
        </View>

        <View style={styles.forecastBox}>
          <Icon name="trending-up" size={28} color="#2ecc71" />
          <Text style={styles.forecastText}>
            If you keep this up, next month's bill will be{' '}
            <Text style={styles.forecastAmount}>₱2,500.45</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={resultVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setResultVisible(false)}
        >
          <View style={{ width: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Icon name="attach-money" size={36} color="#000" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#000', marginTop: 8 }}>Predicted Price</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#000', textAlign: 'center' }}>
              ₱{prediction?.toLocaleString() || '—'}
            </Text>
            <View style={{ height: 16 }} />
            <TouchableOpacity
              onPress={() => setResultVisible(false)}
              style={{ backgroundColor: '#000', borderRadius: 8, padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Bills;