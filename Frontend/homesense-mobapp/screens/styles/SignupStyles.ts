import { StyleSheet } from 'react-native';

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Small logo row at top-left
  logoContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextH: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFD600',
  },
  logoIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    marginHorizontal: -1,
  },
  logoText: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFD600',
  },

  // Main content
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#111827', // near-black
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF', // gray
    marginBottom: 22,
  },

  // Fields
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: '#6B7280', // gray-500
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB', // light gray border
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  // Password input with eye icon
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },

  // Button
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },

  // Footer link
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#1E40AF', // blue
    fontWeight: '500',
    marginLeft: 4,
  },
});
