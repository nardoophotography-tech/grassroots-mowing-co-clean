import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Screens
import HomeScreen from './screens/HomeScreen';
import ServiceScreen from './screens/ServiceScreen';
import BookingScreen from './screens/BookingScreen';
import AdminScreen from './screens/AdminScreen';
import LoginScreen from './screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFB800', // Ochre
          },
          headerTintColor: '#1a1a1a',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'GrassRoots Mowing' }} />
        <Stack.Screen name="Service" component={ServiceScreen} options={{ title: 'Service Details' }} />
        <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book Service' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Admin Login' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Dashboard' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
