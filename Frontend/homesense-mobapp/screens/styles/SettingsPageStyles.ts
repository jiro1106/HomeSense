import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#fff',
        },
        content: {
          flex: 1,
          paddingHorizontal: 20,
        },
        safeArea: {
          flex: 1,
          backgroundColor: '#fff',
        },
        topBar: {
          paddingHorizontal: 12,
          paddingBottom: 4,
        },
        backButton: {
          padding: 6,
          alignSelf: 'flex-start',
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#000',
          marginTop: 20,
          marginBottom: 10,
        },
        settingsItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        },
        settingsItemLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        settingsIcon: {
          marginRight: 15,
        },
        settingsText: {
          fontSize: 16,
          color: '#000',
          flex: 1,
        },
        settingsItemRight: {
          alignItems: 'center',
        },
        switchContainer: {
          width: 52,
          alignItems: 'flex-end',
        },
        bottomContainer: {
          padding: 20,
          paddingBottom: 40,
        },
        logoutButton: {
          backgroundColor: '#ff0000',
          paddingVertical: 15,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoutButtonText: {
          color: '#fff',
          fontSize: 16,
          fontWeight: 'bold',
        },
      });
export default styles;
      