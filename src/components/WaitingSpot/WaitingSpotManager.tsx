import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../contexts/AppContext';
import { WaitingSpot, TransitStop } from '../../types';
import { WaitingSpotPicker } from './WaitingSpotPicker';
import { TransitStopSearch } from './TransitStopSearch';

interface WaitingSpotManagerProps {
  visible?: boolean;
  onClose?: () => void;
}

export function WaitingSpotManager({ visible = true, onClose }: WaitingSpotManagerProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('WaitingSpotManager must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState<WaitingSpot | null>(null);

  const handleCreateSpot = () => {
    setEditingSpot(null);
    setShowCreateModal(true);
  };

  const handleEditSpot = (spot: WaitingSpot) => {
    setEditingSpot(spot);
    setShowCreateModal(true);
  };

  const handleDeleteSpot = (spotId: string) => {
    Alert.alert(
      'Delete Waiting Spot',
      'Are you sure you want to delete this waiting spot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_WAITING_SPOT', payload: spotId })
        }
      ]
    );
  };

  const toggleSpotActive = (spot: WaitingSpot) => {
    const updatedSpot = { ...spot, isActive: !spot.isActive };
    dispatch({ type: 'UPDATE_WAITING_SPOT', payload: updatedSpot });
  };

  const renderSpotItem = ({ item: spot }: { item: WaitingSpot }) => (
    <View style={styles.spotItem}>
      <View style={styles.spotHeader}>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName}>{spot.name}</Text>
          <Text style={styles.spotCoords}>
            {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
          </Text>
          <Text style={styles.spotRadius}>Radius: {spot.radius}m</Text>
        </View>
        
        <View style={styles.spotActions}>
          <Switch
            value={spot.isActive}
            onValueChange={() => toggleSpotActive(spot)}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
            thumbColor={spot.isActive ? 'white' : '#f4f3f4'}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditSpot(spot)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteSpot(spot.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nearby Transit Stops */}
      {spot.transitStops.length > 0 && (
        <View style={styles.transitStopsContainer}>
          <Text style={styles.transitStopsTitle}>Nearby Transit Stops:</Text>
          <View style={styles.transitStopsList}>
            {spot.transitStops.map((stop, index) => (
              <View key={stop.id} style={styles.transitStopChip}>
                <Ionicons
                  name={getTransitIcon(stop.type)}
                  size={12}
                  color="#666"
                />
                <Text style={styles.transitStopText}>{stop.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
          <Text style={styles.title}>Waiting Spots</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateSpot}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

      <FlatList
        data={state.waitingSpots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id}
        style={styles.spotsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No waiting spots yet</Text>
            <Text style={styles.emptySubtext}>
              Click the + button above to add common waiting locations
            </Text>
          </View>
        }
      />

      <WaitingSpotEditor
        visible={showCreateModal}
        spot={editingSpot}
        onClose={() => setShowCreateModal(false)}
        onSave={(spot) => {
          if (editingSpot) {
            dispatch({ type: 'UPDATE_WAITING_SPOT', payload: spot });
          } else {
            dispatch({ type: 'ADD_WAITING_SPOT', payload: spot });
          }
          setShowCreateModal(false);
        }}
      />
      </View>
    </Modal>
  );
}

// Waiting Spot Editor Component
interface WaitingSpotEditorProps {
  visible: boolean;
  spot: WaitingSpot | null;
  onClose: () => void;
  onSave: (spot: WaitingSpot) => void;
}

function WaitingSpotEditor({ visible, spot, onClose, onSave }: WaitingSpotEditorProps) {
  const [selectedLocation, setSelectedLocation] = useState(spot ? {
    latitude: spot.latitude,
    longitude: spot.longitude,
    name: spot.name,
    radius: spot.radius,
  } : null);
  const [transitStops, setTransitStops] = useState<TransitStop[]>(spot?.transitStops || []);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTransitSearch, setShowTransitSearch] = useState(false);

  const handleSave = () => {
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select waiting position');
      return;
    }

    const newSpot: WaitingSpot = {
      id: spot?.id || generateId(),
      userId: 'current-user', // TODO: get from auth context
      name: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      radius: selectedLocation.radius,
      transitStops,
      isActive: spot?.isActive ?? true,
      createdAt: spot?.createdAt || new Date(),
    };

    onSave(newSpot);
    resetForm();
  };

  const resetForm = () => {
    setSelectedLocation(null);
    setTransitStops([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
  };

  const handleAddTransitStop = (stop: TransitStop) => {
    setTransitStops([...transitStops, stop]);
    setShowTransitSearch(false);
  };

  const removeTransitStop = (stopId: string) => {
    setTransitStops(transitStops.filter(stop => stop.id !== stopId));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {spot ? 'Edit Waiting Spot' : 'New Waiting Spot'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Select Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Location</Text>
            {selectedLocation ? (
              <View style={styles.selectedLocation}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{selectedLocation.name}</Text>
                  <Text style={styles.locationCoords}>
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationRadius}>Radius: {selectedLocation.radius}m</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeLocationButton}
                  onPress={() => setShowLocationPicker(true)}
                >
                  <Text style={styles.changeLocationText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectLocationButton}
                onPress={() => setShowLocationPicker(true)}
              >
                <Ionicons name="location-outline" size={24} color="#007AFF" />
                <Text style={styles.selectLocationText}>Select Waiting Position</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Nearby Transit Stops */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Transit Stops</Text>
              <TouchableOpacity
                style={styles.addTransitButton}
                onPress={() => setShowTransitSearch(true)}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
                <Text style={styles.addTransitText}>Add</Text>
              </TouchableOpacity>
            </View>

            {transitStops.length > 0 ? (
              <View style={styles.transitStopsList}>
                {transitStops.map((stop) => (
                  <View key={stop.id} style={styles.transitStopItem}>
                    <View style={styles.transitStopInfo}>
                      <Ionicons
                        name={getTransitIcon(stop.type)}
                        size={20}
                        color="#666"
                      />
                      <View style={styles.transitStopText}>
                        <Text style={styles.transitStopName}>{stop.name}</Text>
                        <Text style={styles.transitStopLines}>
                          {stop.lines.join(', ')}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeTransitStop(stop.id)}
                    >
                      <Ionicons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyTransitText}>
                No transit stops found, click "Add" button to search for nearby transit stops
              </Text>
            )}
          </View>
        </View>

        {/* Location Picker Modal */}
        <WaitingSpotPicker
          visible={showLocationPicker}
          initialLocation={selectedLocation}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
        />

        {/* Transit Stop Search Modal */}
        <TransitStopSearch
          visible={showTransitSearch}
          location={selectedLocation}
          onClose={() => setShowTransitSearch(false)}
          onSelect={handleAddTransitStop}
        />
      </View>
    </Modal>
  );
}

const getTransitIcon = (type: string) => {
  switch (type) {
    case 'bus':
      return 'bus-outline';
    case 'train':
      return 'train-outline';
    case 'lightrail':
      return 'subway-outline';
    default:
      return 'location-outline';
  }
};

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
  spotsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  spotItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  spotCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  spotRadius: {
    fontSize: 14,
    color: '#666',
  },
  spotActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  transitStopsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  transitStopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  transitStopsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  transitStopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  transitStopText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
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
    paddingHorizontal: 40,
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
  selectedLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  locationRadius: {
    fontSize: 14,
    color: '#666',
  },
  changeLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  changeLocationText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  selectLocationText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  addTransitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addTransitText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  transitStopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transitStopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transitStopName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  transitStopLines: {
    fontSize: 14,
    color: '#666',
  },
  emptyTransitText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});