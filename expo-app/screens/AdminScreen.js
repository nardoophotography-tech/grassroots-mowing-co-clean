import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import LogoAdmin from '../components/LogoAdmin';

export default function AdminScreen() {
  const [assets, setAssets] = useState({});
  const [businessConfig, setBusinessConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assetsSnap, configSnap] = await Promise.all([
        getDoc(doc(db, 'assets', 'config')),
        getDoc(doc(db, 'systemConfig', 'business'))
      ]);

      if (assetsSnap.exists()) setAssets(assetsSnap.data());
      if (configSnap.exists()) setBusinessConfig(configSnap.data());
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (key) => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      
      // Basic check for PNG (Expo doesn't always provide strict mime type reliably without checking extension, 
      // but we enforce it logically where possible)
      if (asset.uri.toLowerCase().endsWith('.jpg') || asset.uri.toLowerCase().endsWith('.jpeg')) {
        Alert.alert('Invalid Format', 'Please upload PNG images only.');
        return;
      }

      uploadImage(asset.uri, key);
    }
  };

  const uploadImage = async (uri, key) => {
    setUploadingId(key);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `assets/${key}.png`);
      const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: 'image/png' });

      uploadTask.on('state_changed', 
        (snapshot) => {
          // Progress can be tracked here
        }, 
        (error) => {
          console.error(error);
          Alert.alert('Upload Failed');
          setUploadingId(null);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update Firestore
          const docRef = doc(db, 'assets', 'config');
          await updateDoc(docRef, {
            [key]: { url: downloadURL }
          });
          
          // Update Local UI
          setAssets(prev => ({ ...prev, [key]: { url: downloadURL } }));
          setUploadingId(null);
          Alert.alert('Success', 'Image updated successfully');
        }
      );
    } catch (error) {
      console.error(error);
      setUploadingId(null);
      Alert.alert('Error', 'Failed to process image');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFB800" /></View>;

  const assetKeys = Object.keys(assets);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Asset Management</Text>
      <FlatList
        data={assetKeys}
        showsVerticalScrollIndicator={false}
        keyExtractor={item => item}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Business Logo</Text>
            <LogoAdmin 
              currentLogo={businessConfig?.logo?.url} 
              onUpdated={(url) => setBusinessConfig(prev => ({ ...prev, logo: { ...prev?.logo, url } }))}
            />
            <Text style={styles.sectionTitle}>Service Assets</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item}</Text>
            <TouchableOpacity onPress={() => pickImage(item)} disabled={uploadingId === item}>
              {assets[item]?.url ? (
                <Image source={{ uri: assets[item].url }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Text style={styles.placeholderText}>Tap to add image</Text>
                </View>
              )}
              {uploadingId === item && (
                <View style={styles.overlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.overlayText}>Uploading...</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#ccc', marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { color: '#fff', fontSize: 16, marginBottom: 12, fontWeight: '600' },
  image: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#333' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  overlayText: { color: '#fff', marginTop: 8 }
});
