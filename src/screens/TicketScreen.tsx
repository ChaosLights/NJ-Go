import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../contexts/AppContext';

export function TicketScreen() {
  const { state } = useAppContext();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {state.tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No Tickets</Text>
            <Text style={styles.emptySubtext}>Tickets will be displayed here after purchase</Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>
            {/* 将在后续实现车票列表 */}
            <Text>Ticket list will be displayed here</Text>
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
  ticketsList: {
    padding: 20,
  },
});