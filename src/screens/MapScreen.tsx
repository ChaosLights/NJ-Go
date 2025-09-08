import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NJGoMapView } from '../components/Map/MapView';
import { useAppContext } from '../contexts/AppContext';
import { MapRegion, MapMarker, Location } from '../types';

// Default map region (New Jersey center)
const DEFAULT_REGION: MapRegion = {
  latitude: 40.2206,
  longitude: -74.7563,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export function MapScreen() {
  const { state, dispatch } = useAppContext();
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  // Update map markers
  useEffect(() => {
    const newMarkers: MapMarker[] = [];

    // Add destination markers
    state.travelPlans.forEach(plan => {
      plan.destinations.forEach(destination => {
        newMarkers.push({
          id: `dest-${destination.id}`,
          coordinate: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
          title: destination.name,
          description: `Destination - ${destination.address}`,
          type: 'destination',
        });
      });
    });

    // Add waiting spot markers
    state.waitingSpots.forEach(spot => {
      newMarkers.push({
        id: `waiting-${spot.id}`,
        coordinate: {
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        title: spot.name,
        description: `Waiting Spot - Radius ${spot.radius}m`,
        type: 'waitingSpot',
      });

      // Add transit stop markers near waiting spots
      spot.transitStops.forEach(stop => {
        newMarkers.push({
          id: `stop-${stop.id}`,
          coordinate: {
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
          title: stop.name,
          description: `${stop.type.toUpperCase()} Station - ${stop.lines.join(', ')}`,
          type: 'transitStop',
        });
      });
    });

    setMarkers(newMarkers);
  }, [state.travelPlans, state.waitingSpots]);

  // Handle map click
  const handleMapPress = (coordinate: Location) => {
    Alert.alert(
      'Add Location',
      `坐标: ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Destination',
          onPress: () => handleAddDestination(coordinate),
        },
        {
          text: 'Add Waiting Spot',
          onPress: () => handleAddWaitingSpot(coordinate),
        },
      ]
    );
  };

  // Add destination
  const handleAddDestination = (coordinate: Location) => {
    // 这里应该打开一个模态框让用户输入详细信息
    // 现在先显示一个提示
    Alert.alert('Add Destination', 'Please add destination details in travel plan');
  };

  // Add waiting spot
  const handleAddWaitingSpot = (coordinate: Location) => {
    // 这里应该打开一个模态框让用户输入详细信息
    // 现在先显示一个提示
    Alert.alert('Add Waiting Spot', 'Please set waiting spot details');
  };

  // Handle marker press
  const handleMarkerPress = (marker: MapMarker) => {
    Alert.alert(
      marker.title,
      marker.description,
      [
        { text: 'OK', style: 'default' },
      ]
    );
  };

  // Locate to user's current position
  const handleLocationPress = () => {
    if (state.location.current) {
      setRegion({
        latitude: state.location.current.latitude,
        longitude: state.location.current.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert('Location Service', 'Unable to get current position, please check location permission settings');
    }
  };

  return (
    <View style={styles.container}>
      <NJGoMapView
        region={region}
        markers={markers}
        onRegionChange={setRegion}
        onMarkerPress={handleMarkerPress}
        onMapPress={handleMapPress}
        showsUserLocation={true}
        followsUserLocation={false}
      />
      
      {/* Floating buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleLocationPress}
        >
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Map legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendText}>Destinations</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4ECDC4' }]} />
          <Text style={styles.legendText}>Waiting Spots</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#45B7D1' }]} />
          <Text style={styles.legendText}>Transit Stops</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingButtons: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    boxShadow: '0 4px 4.65px rgba(0, 0, 0, 0.3)',
  },
  legend: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    elevation: 4,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.25)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
});