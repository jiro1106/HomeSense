// Bills.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { styles } from './styles/BillsStyles';

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const Bills = () => {
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <Text style={styles.pageTitle}>Estimated Bills</Text>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Dropdown */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownVisible(true)}>
            <Text style={styles.dropdownText}>{selectedMonth}</Text>
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

        {/* Filter */}
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-list" size={17} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
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

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewType === 'table' ? (
          <>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Week</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Electricity Rate</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellBorder]}>Weekly Energy Consumption</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Bill Estimation</Text>
            </View>

            {/* Table Rows */}
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

            {/* Total */}
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

        {/* Highlighted Bill */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Estimated Bill for {selectedMonth}</Text>
          <Text style={styles.highlightAmount}>₱2,413.73</Text>
        </View>

        {/* Forecast */}
        <View style={styles.forecastBox}>
          <Icon name="trending-up" size={28} color="#2ecc71" />
          <Text style={styles.forecastText}>
            If you keep this up, next month's bill will be{' '}
            <Text style={styles.forecastAmount}>₱2,500.45</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default Bills;
