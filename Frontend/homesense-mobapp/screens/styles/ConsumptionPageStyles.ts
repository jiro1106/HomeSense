import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingVertical: 15,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  dropdownContainer: {
    marginRight: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minWidth: 120,
    backgroundColor: '#f1f1f1',
  },
  dropdownText: {
    fontSize: 14,
    color: '#000',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: -30,
  },
  toggleText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 13,
  },
  filterButton: {
    backgroundColor: '#FFD700',
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
    paddingHorizontal: 4,
  },
  tableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 12,
  },
  tableHeaderText2: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 10,
  },
  statusCell: {
   flex: 0.47, // proportionally smaller
  textAlign: 'center',// 👈 smaller portion than others
},

  
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 10,
    marginTop: 10,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  navItem: {
    alignItems: 'center',
  },
  fab: {
    backgroundColor: '#FFD700',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
