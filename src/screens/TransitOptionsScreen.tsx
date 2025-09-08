import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../contexts/AppContext';

export function TransitOptionsScreen() {
  const { state } = useAppContext();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {state.transitOptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="train-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No Transit Options</Text>
            <Text style={styles.emptySubtext}>Please check real-time transit information near waiting spots</Text>
          </View>
        ) : (
          <View style={styles.optionsList}>
            {/* Transit options list will be implemented later */}
            <Text>Transit options list will be displayed here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  optionsList: {
    padding: 20,
  },
});