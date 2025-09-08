import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../contexts/AppContext';
import { TravelPlan, TimeSlot, Destination } from '../../types';
import { DestinationPicker } from './DestinationPicker';

interface TravelPlanManagerProps {
  visible?: boolean;
  onClose?: () => void;
}

export function TravelPlanManager({ visible = true, onClose }: TravelPlanManagerProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('TravelPlanManager must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TravelPlan | null>(null);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  const handleEditPlan = (plan: TravelPlan) => {
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleDeletePlan = (planId: string) => {
    Alert.alert(
      'Delete Travel Plan',
      'Are you sure you want to delete this travel plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_TRAVEL_PLAN', payload: planId })
        }
      ]
    );
  };

  const renderPlanItem = ({ item: plan }: { item: TravelPlan }) => (
    <View style={styles.planItem}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.planActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditPlan(plan)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeletePlan(plan.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.planDetails}>
        <Text style={styles.detailText}>
          📍 {plan.destinations.length} destinations
        </Text>
        <Text style={styles.detailText}>
          ⏰ {plan.timeSlots.length} time slots
        </Text>
        <Text style={[styles.statusText, { color: plan.isActive ? '#34C759' : '#999' }]}>
          {plan.isActive ? '● Enabled' : '○ Disabled'}
        </Text>
      </View>

      {/* Time slots preview */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlotsPreview}>
        {plan.timeSlots.map((slot, index) => (
          <View key={slot.id} style={styles.timeSlotChip}>
            <Text style={styles.timeSlotText}>
              {getDayName(slot.dayOfWeek)} {slot.startTime}-{slot.endTime}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Travel Plans</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreatePlan}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

      <FlatList
        data={state.travelPlans}
        renderItem={renderPlanItem}
        keyExtractor={(item) => item.id}
        style={styles.plansList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No travel plans yet</Text>
            <Text style={styles.emptySubtext}>Click the + button above to create your first plan</Text>
          </View>
        }
      />

      <TravelPlanEditor
        visible={showCreateModal}
        plan={editingPlan}
        onClose={() => setShowCreateModal(false)}
        onSave={(plan) => {
          if (editingPlan) {
            dispatch({ type: 'UPDATE_TRAVEL_PLAN', payload: plan });
          } else {
            dispatch({ type: 'ADD_TRAVEL_PLAN', payload: plan });
          }
          setShowCreateModal(false);
        }}
      />
      </View>
    </Modal>
  );
}

// Travel plan editor component
interface TravelPlanEditorProps {
  visible: boolean;
  plan: TravelPlan | null;
  onClose: () => void;
  onSave: (plan: TravelPlan) => void;
}

function TravelPlanEditor({ visible, plan, onClose, onSave }: TravelPlanEditorProps) {
  const [name, setName] = useState(plan?.name || '');
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(plan?.timeSlots || []);
  const [destinations, setDestinations] = useState<Destination[]>(plan?.destinations || []);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter plan name');
      return;
    }

    if (timeSlots.length === 0) {
      Alert.alert('Error', 'Please add at least one time slot');
      return;
    }

    if (destinations.length === 0) {
      Alert.alert('Error', 'Please add at least one destination');
      return;
    }

    const newPlan: TravelPlan = {
      id: plan?.id || generateId(),
      userId: 'current-user', // TODO: get from auth context
      name: name.trim(),
      timeSlots,
      destinations,
      isActive,
      createdAt: plan?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onSave(newPlan);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setIsActive(true);
    setTimeSlots([]);
    setDestinations([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: generateId(),
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '17:00',
      destinationIds: [],
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const updateTimeSlot = (index: number, updatedSlot: Partial<TimeSlot>) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], ...updatedSlot };
    setTimeSlots(updated);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {plan ? 'Edit Plan' : 'New Plan'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Plan name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Weekday Commute"
            />
          </View>

          {/* Enable status */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.toggleRow}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.sectionTitle}>Enable Plan</Text>
              <View style={[styles.toggle, isActive && styles.toggleActive]}>
                {isActive && <View style={styles.toggleThumb} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Destinations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Destinations</Text>
              <TouchableOpacity 
                style={styles.addSmallButton}
                onPress={() => setShowDestinationPicker(true)}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
                <Text style={styles.addSmallButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {destinations.map((dest, index) => (
              <View key={dest.id} style={styles.destinationItem}>
                <View>
                  <Text style={styles.destinationName}>{dest.name}</Text>
                  <Text style={styles.destinationAddress}>{dest.address}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setDestinations(destinations.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Time slots */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Time Slots</Text>
              <TouchableOpacity style={styles.addSmallButton} onPress={addTimeSlot}>
                <Ionicons name="add" size={16} color="#007AFF" />
                <Text style={styles.addSmallButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {timeSlots.map((slot, index) => (
              <TimeSlotEditor
                key={slot.id}
                slot={slot}
                destinations={destinations}
                onChange={(updatedSlot) => updateTimeSlot(index, updatedSlot)}
                onRemove={() => removeTimeSlot(index)}
              />
            ))}
          </View>
        </ScrollView>

        <DestinationPicker
          visible={showDestinationPicker}
          onClose={() => setShowDestinationPicker(false)}
          onSelect={(destination) => {
            setDestinations([...destinations, destination]);
            setShowDestinationPicker(false);
          }}
        />
      </View>
    </Modal>
  );
}

// Time slot editor component
interface TimeSlotEditorProps {
  slot: TimeSlot;
  destinations: Destination[];
  onChange: (slot: Partial<TimeSlot>) => void;
  onRemove: () => void;
}

function TimeSlotEditor({ slot, destinations, onChange, onRemove }: TimeSlotEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleDestination = (destId: string) => {
    const isSelected = slot.destinationIds.includes(destId);
    const newIds = isSelected
      ? slot.destinationIds.filter(id => id !== destId)
      : [...slot.destinationIds, destId];
    onChange({ destinationIds: newIds });
  };

  return (
    <View style={styles.timeSlotEditor}>
      <TouchableOpacity 
        style={styles.timeSlotHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.timeSlotHeaderText}>
          {getDayName(slot.dayOfWeek)} {slot.startTime}-{slot.endTime}
        </Text>
        <View style={styles.timeSlotActions}>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.timeSlotContent}>
          {/* Day selection */}
          <Text style={styles.subSectionTitle}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.daySelector}>
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayChip, slot.dayOfWeek === index && styles.dayChipSelected]}
                  onPress={() => onChange({ dayOfWeek: index })}
                >
                  <Text style={[
                    styles.dayChipText, 
                    slot.dayOfWeek === index && styles.dayChipTextSelected
                  ]}>
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Time selection */}
          <View style={styles.timeInputs}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>Start Time</Text>
              <TextInput
                style={styles.timeInput}
                value={slot.startTime}
                onChangeText={(time) => onChange({ startTime: time })}
                placeholder="HH:MM"
              />
            </View>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>End Time</Text>
              <TextInput
                style={styles.timeInput}
                value={slot.endTime}
                onChangeText={(time) => onChange({ endTime: time })}
                placeholder="HH:MM"
              />
            </View>
          </View>

          {/* Destination selection */}
          <Text style={styles.subSectionTitle}>Possible Destinations</Text>
          <View style={styles.destinationCheckboxes}>
            {destinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={styles.checkbox}
                onPress={() => toggleDestination(dest.id)}
              >
                <Ionicons
                  name={slot.destinationIds.includes(dest.id) ? "checkbox" : "square-outline"}
                  size={20}
                  color={slot.destinationIds.includes(dest.id) ? "#007AFF" : "#999"}
                />
                <Text style={styles.checkboxText}>{dest.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const DAYS = [
  { name: 'Sunday', short: 'Sun' },
  { name: 'Monday', short: 'Mon' },
  { name: 'Tuesday', short: 'Tue' },
  { name: 'Wednesday', short: 'Wed' },
  { name: 'Thursday', short: 'Thu' },
  { name: 'Friday', short: 'Fri' },
  { name: 'Saturday', short: 'Sat' },
];

const getDayName = (dayOfWeek: number) => DAYS[dayOfWeek]?.short || '';

const generateId = () => Math.random().toString(36).substr(2, 9);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plansList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
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
  planActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  planDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotsPreview: {
    marginTop: 8,
  },
  timeSlotChip: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  timeSlotText: {
    fontSize: 12,
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#999',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
    alignItems: 'flex-end',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  addSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addSmallButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  destinationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  destinationName: {
    fontSize: 16,
    color: '#333',
  },
  destinationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  
  // TimeSlot Editor styles
  timeSlotEditor: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  timeSlotHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timeSlotActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  timeSlotContent: {
    padding: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  daySelector: {
    flexDirection: 'row',
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  dayChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayChipText: {
    fontSize: 14,
    color: '#666',
  },
  dayChipTextSelected: {
    color: 'white',
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  timeInputGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  destinationCheckboxes: {
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
});