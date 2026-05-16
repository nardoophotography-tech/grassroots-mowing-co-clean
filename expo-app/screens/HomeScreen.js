import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Logo from '../components/BusinessLogo';

export default function HomeScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [assets, setAssets] = useState({});
  const [businessConfig, setBusinessConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesSnapshot, configDoc, sysConfigDoc] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDoc(doc(db, 'assets', 'config')),
        getDoc(doc(db, 'systemConfig', 'business'))
      ]);

      setServices(servicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      if (configDoc.exists()) setAssets(configDoc.data());
      if (sysConfigDoc.exists()) setBusinessConfig(sysConfigDoc.data());

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderService = ({ item }) => {
    // Attempt to load from central configuration
    const imageUrl = assets[item.id]?.url || assets['global_placeholder']?.url || 'https://via.placeholder.com/400x300.png?text=No+Image';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Service', { service: item, imageUrl })}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.cardBody}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>Starting at \${item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB800" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        showsVerticalScrollIndicator={false}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <Logo url={businessConfig?.logo?.url} />
            <Text style={styles.businessTitle}>
              {businessConfig?.businessDisplayName || 'GrassRoots Mowing Co.'}
            </Text>
            <Text style={styles.location}>
              {businessConfig?.primaryLocation || 'Our location'} • {businessConfig?.postcode || ''}
            </Text>
          </View>
        }
        renderItem={renderService}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  headerArea: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  businessTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  location: { fontSize: 16, color: '#aaa', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  image: { width: '100%', height: 200, backgroundColor: '#333' },
  cardBody: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  price: { fontSize: 16, color: '#FFB800', fontWeight: 'bold' }
});
