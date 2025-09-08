import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../contexts/AppContext';

export function TravelPlanScreen() {
  const { state } = useAppContext();

  const handleAddPlan = () => {
    // Will be implemented later
    console.log('Add new travel plan');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>My Travel Plans</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPlan}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {state.travelPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No Travel Plans</Text>
            <Text style={styles.emptySubtext}>Click the "+" button in the top right to create your first travel plan</Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {state.travelPlans.map((plan) => (
              <TouchableOpacity key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planStatus}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={styles.planDetails}>
                  {plan.destinations.length} destinations
                </Text>
                <Text style={styles.planDetails}>
                  {plan.timeSlots.length} time slots
                </Text>
              </TouchableOpacity>
            ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
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
  plansList: {
    padding: 20,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0 1px 2.22px rgba(0, 0, 0, 0.22)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  planStatus: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  planDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});