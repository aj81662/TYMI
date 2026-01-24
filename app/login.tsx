import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser, signupUser } from '../src/lib/backendService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await loginUser(email, password);
      router.push('/meds');
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setLoading(true);
    try {
      await signupUser({ email, password, user_key: '' });
      Alert.alert('Signup', 'Signup successful — please check email for confirmation if required');
    } catch (err: any) {
      Alert.alert('Signup failed', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MedBuddy — Login</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      {loading ? <ActivityIndicator /> : (
        <View style={styles.row}>
          <Button title="Sign In" onPress={handleLogin} />
          <View style={{ width: 12 }} />
          <Button title="Sign Up" onPress={handleSignup} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'center' },
});
