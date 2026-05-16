import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function BookingScreen({ route, navigation }) {
  const { service } = route.params;
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Login Required', 
        'You must be signed in to book a service. Please log in or create an account to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        userId: auth.currentUser.uid,
        serviceId: service.id,
        status: 'pending',
        amount: service.price,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      
      Alert.alert(
        'Booking Created', 
        `Proceeding to payment for ${service.title}...`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
      
      // Navigate to your Stripe Payment Sheet logic here
      
    } catch (error) {
      console.error(error);
      Alert.alert('Booking Error', 'Could not create booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Confirm Booking</Text>
      
      <View style={styles.details}>
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.description}>{service.description}</Text>
        <Text style={styles.price}>\${service.price}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleBooking}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Book & Pay</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  headline: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  details: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 12, marginBottom: 32 },
  title: { fontSize: 22, color: '#fff', fontWeight: '600', marginBottom: 12 },
  description: { fontSize: 16, color: '#aaa', marginBottom: 16, lineHeight: 24 },
  price: { fontSize: 24, color: '#FFB800', fontWeight: 'bold' },
  button: { backgroundColor: '#FFB800', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' }
});
