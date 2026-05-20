import React from "react";
import { View, Image, StyleSheet } from "react-native";

const FALLBACK = "https://via.placeholder.com/512x512.png?text=Upload+Logo";

export default function Logo({ url }) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: url && url.length > 0 ? url : FALLBACK }}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center"
  },
  logo: {
    width: "100%",
    height: "100%"
  }
});
