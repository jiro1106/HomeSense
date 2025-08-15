import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  content: {
    flexGrow: 1, // fill available space but allow flexibility
    justifyContent: 'center', // vertical center in available space
    alignItems: 'center',     // horizontal center
    width: '100%',
    paddingBottom: 80, // extra gap so button doesn't visually overlap
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFD700',
    fontSize: 35,
    fontWeight: 'bold',
    fontFamily: 'Arial',
  },
  logoImage: {
    width: 50,
    height: 50,
    marginHorizontal: -1,
  },
  getStartedBtn: {
    backgroundColor: '#FFCE00',
    borderRadius: 20,
    paddingVertical: 17,
    width: '90%',
    shadowColor: '#FFCE00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
