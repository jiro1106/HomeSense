import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Main Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#000',
  },

  // Form Fields
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    tintColor: '#666',
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    color: '#666',
  },

  // Register Button
  registerButton: {
    backgroundColor: '#FFD600',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
