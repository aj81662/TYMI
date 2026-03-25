import React from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFrameWrap}>
        <iframe src="/site/index.html" style={styles.webFrame as any} title="TYMI Site" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>TYMI</Text>
        <Text style={styles.subtitle}>Open the web target to use the site pages.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  webFrameWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
});
