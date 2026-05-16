import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';

export default function ServiceScreen({ route, navigation }) {
  const { service, imageUrl } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.price}>\${service.price}</Text>
        <Text style={styles.description}>{service.description}</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Booking', { service })}
        >
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  image: { width: '100%', height: 300, backgroundColor: '#333' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  price: { fontSize: 22, color: '#FFB800', fontWeight: 'bold', marginBottom: 20 },
  description: { fontSize: 16, color: '#aaa', lineHeight: 24, marginBottom: 32 },
  button: { backgroundColor: '#FFB800', padding: 18, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' }
});
