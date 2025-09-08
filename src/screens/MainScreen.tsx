import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../contexts/AppContext';
import { useAutoLocation } from '../hooks/useLocation';
import { useAutoShakeToPurchase } from '../hooks/useShakeToPurchase';

// Components
import { NJGoMapView } from '../components/Map/MapView';
import { TransitRecommendations } from '../components/Transit/TransitRecommendations';
import { TicketDisplay } from '../components/Ticket/TicketDisplay';
import { TicketManager } from '../components/Ticket/TicketManager';
import { TravelPlanManager } from '../components/TravelPlan/TravelPlanManager';
import { WaitingSpotManager } from '../components/WaitingSpot/WaitingSpotManager';

// Types
import { MapRegion, MapMarker } from '../types';
import { config } from '../config';

export function MainScreen() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('MainScreen must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const location = useAutoLocation({
    enableWaitingSpotDetection: true,
  });
  
  // Listen for entering waiting spot events
  useEffect(() => {
    if (location.isInWaitingSpot && location.activeWaitingSpot) {
      Alert.alert('Entered Waiting Area', `Entered ${location.activeWaitingSpot.name} area, starting intelligent recommendations`);
    }
  }, [location.isInWaitingSpot, location.activeWaitingSpot]);
  
  const shake = useAutoShakeToPurchase({
    showConfirmation: false, // Quick ticket purchase mode
  });

  // State management
  const [showTicketManager, setShowTicketManager] = useState(false);
  const [showTravelPlanManager, setShowTravelPlanManager] = useState(false);
  const [showWaitingSpotManager, setShowWaitingSpotManager] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: location.location?.latitude || config.defaultMapRegion.latitude,
    longitude: location.location?.longitude || config.defaultMapRegion.longitude,
    latitudeDelta: config.defaultMapRegion.latitudeDelta,
    longitudeDelta: config.defaultMapRegion.longitudeDelta,
  });

  // Generate map markers
  const generateMapMarkers = (): MapMarker[] => {
    const markers: MapMarker[] = [];

    // Add travel plan destination markers
    state.travelPlans.forEach((plan: any) => {
      if (plan.isActive) {
        plan.destinations.forEach((dest: any) => {
          markers.push({
            id: `dest-${dest.id}`,
            coordinate: { latitude: dest.latitude, longitude: dest.longitude },
            title: dest.name,
            description: `Travel Plan: ${plan.name}`,
            type: 'destination',
          });
        });
      }
    });

    // Add waiting spot markers
    state.waitingSpots.forEach((spot: any) => {
      if (spot.isActive) {
        markers.push({
          id: `spot-${spot.id}`,
          coordinate: { latitude: spot.latitude, longitude: spot.longitude },
          title: spot.name,
          description: `Waiting Spot (Radius: ${spot.radius}m)`,
          type: 'waitingSpot',
        });
      }
    });

    // Add transit stop markers
    state.waitingSpots.forEach((spot: any) => {
      spot.transitStops.forEach((stop: any) => {
        markers.push({
          id: `stop-${stop.id}`,
          coordinate: { latitude: stop.latitude, longitude: stop.longitude },
          title: stop.name,
          description: `Routes: ${stop.lines.join(', ')}`,
          type: 'transitStop',
        });
      });
    });

    return markers;
  };

  // Handle map click
  const handleMapPress = (coordinate: any) => {
    console.log('Map pressed at:', coordinate);
  };

  // Quick actions
  const quickActions = [
    {
      id: 'plans',
      icon: 'calendar-outline' as const,
      title: 'Travel Plans',
      subtitle: `${state.travelPlans.length} plans`,
      color: '#007AFF',
      onPress: () => setShowTravelPlanManager(true),
    },
    {
      id: 'spots',
      icon: 'location-outline' as const,
      title: 'Waiting Spots',
      subtitle: `${state.waitingSpots.length} spots`,
      color: '#34C759',
      onPress: () => setShowWaitingSpotManager(true),
    },
    {
      id: 'tickets',
      icon: 'ticket-outline' as const,
      title: 'My Tickets',
      subtitle: `${state.tickets.length} tickets`,
      color: '#FF9500',
      onPress: () => setShowTicketManager(true),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>NJ Go</Text>
          <Text style={styles.subtitle}>Smart Transit Assistant</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Location Status */}
          {location.isInWaitingSpot && location.activeWaitingSpot && (
            <View style={styles.locationStatus}>
              <Ionicons name="location" size={16} color="#34C759" />
              <Text style={styles.locationText}>
                {location.activeWaitingSpot.name}
              </Text>
            </View>
          )}
          
          {/* Shake Status */}
          {shake.isEnabled && (
            <TouchableOpacity 
              style={[styles.shakeIndicator, shake.isInCooldown && styles.shakeInCooldown]}
              onPress={shake.manualTrigger}
            >
              <Ionicons 
                name="phone-portrait-outline" 
                size={16} 
                color={shake.canPurchase ? "#007AFF" : "#ccc"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <NJGoMapView
          region={mapRegion}
          markers={generateMapMarkers()}
          onRegionChange={setMapRegion}
          onMapPress={handleMapPress}
          showsUserLocation={true}
          followsUserLocation={location.isInWaitingSpot}
        />
        
        {/* Quick Actions Overlay */}
        <View style={styles.quickActionsOverlay}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionButton, { borderLeftColor: action.color }]}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon} size={20} color={action.color} />
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manual Purchase Button */}
        {state.ui.selectedTransitOption && !location.isInWaitingSpot && (
          <TouchableOpacity 
            style={styles.manualPurchaseButton}
            onPress={() => shake.manualPurchase()}
            disabled={shake.isPurchasing}
          >
            <Ionicons name="card-outline" size={20} color="white" />
            <Text style={styles.manualPurchaseText}>
              {shake.isPurchasing ? 'Purchasing...' : 'Buy Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {location.isInWaitingSpot ? (
          // Show recommendations when at waiting spot
          <TransitRecommendations />
        ) : (
          // Show prompt when not at waiting spot
          <View style={styles.waitingPrompt}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.waitingTitle}>Waiting for Smart Recommendations</Text>
            <Text style={styles.waitingSubtext}>
              Go to your designated waiting spot, and the system will automatically recommend the most suitable transportation options
            </Text>
            
            {/* If no waiting spots, prompt to add */}
            {state.waitingSpots.length === 0 && (
              <TouchableOpacity 
                style={styles.addSpotButton}
                onPress={() => setShowWaitingSpotManager(true)}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
                <Text style={styles.addSpotButtonText}>Add Waiting Spot</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Modals */}
      <TicketDisplay />
      
      <TicketManager 
        visible={showTicketManager}
        onClose={() => setShowTicketManager(false)}
      />
      
      <TravelPlanManager 
        visible={showTravelPlanManager}
        onClose={() => setShowTravelPlanManager(false)}
      />
      
      <WaitingSpotManager 
        visible={showWaitingSpotManager}
        onClose={() => setShowWaitingSpotManager(false)}
      />

      {/* Debug Info (development mode) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Location: {location.location ? '✓' : '✗'} | 
            Heading: {location.heading}° | 
            Shake: {shake.isEnabled ? '✓' : '✗'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

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
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  shakeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shakeInCooldown: {
    backgroundColor: '#f0f0f0',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  quickActionsOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  quickActionText: {
    marginLeft: 12,
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  manualPurchaseButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 6,
    gap: 8,
  },
  manualPurchaseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPanel: {
    height: 300,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 10,
  },
  waitingPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  addSpotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
    gap: 6,
  },
  addSpotButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 320,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'monospace',
  },
});