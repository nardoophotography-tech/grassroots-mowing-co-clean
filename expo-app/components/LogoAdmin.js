import React, { useState } from "react";
import { View, Image, Text, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadLogoToFirebase, updateLogoInConfig } from "../services/logoService";

export default function LogoAdmin({ currentLogo, onUpdated }) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;

    // MUST be PNG only
    if (!uri.toLowerCase().includes(".png")) {
      Alert.alert("Invalid File", "Only PNG files are allowed");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadLogoToFirebase(uri);
      await updateLogoInConfig(url);
      onUpdated(url);
      Alert.alert("Success", "Logo updated successfully");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not upload logo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: currentLogo || "https://via.placeholder.com/512x512.png?text=Upload+Logo" }}
        style={styles.logo}
        resizeMode="contain"
      />
      <TouchableOpacity 
        style={[styles.button, uploading && styles.buttonDisabled]} 
        onPress={pickImage} 
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Change Logo</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16
  },
  button: {
    backgroundColor: "#FFB800",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#1a1a1a",
    fontWeight: "bold"
  }
});
