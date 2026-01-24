import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useMedications } from '../src/hooks/useMedications';
import { createMedication, deleteMedication } from '../src/lib/backendService';
import { useRouter } from 'expo-router';
import { signOutUser } from '../src/lib/backendService';

export default function MedsPage() {
  const router = useRouter();
  const { medications, loading } = useMedications();
  const [newDrug, setNewDrug] = useState('');

  async function handleCreate() {
    if (!newDrug) return Alert.alert('Enter medication name');
    try {
      // user_key will be taken from session in createMedication payload; for now try to read current user
      const userKey = (await (await import('../src/lib/supabase')).supabase.auth.getUser()).data?.user?.id;
      if (!userKey) return Alert.alert('Not authenticated');
      await createMedication({ user_key: userKey, drug_name: newDrug });
      setNewDrug('');
    } catch (err: any) {
      Alert.alert('Create failed', err?.message || String(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMedication(id);
    } catch (err: any) {
      Alert.alert('Delete failed', err?.message || String(err));
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      router.push('/login');
    } catch (err: any) {
      Alert.alert('Sign out failed', err?.message || String(err));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <Button title="Sign Out" onPress={handleSignOut} />
      </View>

      <View style={styles.form}>
        <TextInput placeholder="New medication name" value={newDrug} onChangeText={setNewDrug} style={styles.input} />
        <Button title="Add" onPress={handleCreate} />
      </View>

      {loading ? <Text>Loading...</Text> : (
        <FlatList data={medications} keyExtractor={(i) => String((i as any).id)} renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{(item as any).drug_name || '—'}</Text>
            <Button title="Delete" onPress={() => handleDelete((item as any).id)} />
          </View>
        )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20 },
  form: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  itemText: { fontSize: 16 },
});
