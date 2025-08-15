import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Logo Section
  logoContainer: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    marginTop: 50,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextH: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FFD600',
  },
  logoText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FFD600',
  },
  logoIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginHorizontal: -1,
  },

  // Main Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingTop: 50,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
  },
  signUpLink: {
    fontSize: 14,
    color: '#007BFF',
    marginLeft: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },

  // Password container
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50, // Ensures same height on both platforms
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    textAlignVertical: 'center', // helps Android align vertically
  },

  // Remember me & Forgot password row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#555',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },

  // Button
  button: {
    backgroundColor: '#FFD600',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
