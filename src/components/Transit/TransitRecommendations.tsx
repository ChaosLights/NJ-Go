import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../contexts/AppContext';
import { useAutoLocation } from '../../hooks/useLocation';
import { transitRecommendationService } from '../../services/TransitRecommendationService';
import { TransitOption, TravelPlan } from '../../types';

export function TransitRecommendations() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('TransitRecommendations must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const location = useAutoLocation({
    enableWaitingSpotDetection: true,
  });

  const [recommendations, setRecommendations] = useState<{ [planId: string]: TransitOption[] }>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    if (!location.isInWaitingSpot || !location.activeWaitingSpot || !location.location) {
      return;
    }

    setIsLoading(true);
    try {
      const newRecommendations = await transitRecommendationService.getRecommendations(
        location.location,
        location.heading,
        location.activeWaitingSpot,
        state.travelPlans
      );

      setRecommendations(newRecommendations);
      setLastUpdate(new Date());

      // Set default active tab
      const planIds = Object.keys(newRecommendations);
      if (planIds.length > 0 && !activeTab) {
        setActiveTab(planIds[0]);
      }

      // Update recommendations in global state
      const allOptions = Object.values(newRecommendations).flat();
      dispatch({ type: 'SET_TRANSIT_OPTIONS', payload: allOptions });

    } catch (error) {
      console.error('Failed to load recommendations:', error);
      Alert.alert('Error', 'Unable to load transit recommendations, please check network connection');
    } finally {
      setIsLoading(false);
    }
  }, [location.isInWaitingSpot, location.activeWaitingSpot, location.location, location.heading, state.travelPlans, activeTab, dispatch]);

  // Setup auto refresh
  const setupRefreshInterval = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    const interval = setInterval(() => {
      loadRecommendations();
    }, 30000); // Refresh every 30 seconds

    setRefreshInterval(interval);
  }, [loadRecommendations]);

  // Clear refresh interval
  const clearRefreshInterval = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  // Trigger when entering waiting spot
  const handleEnterWaitingSpot = useCallback((waitingSpot: any) => {
    console.log('Enter waiting spot:', waitingSpot.name);
    loadRecommendations();
  }, [loadRecommendations]);

  // Trigger when leaving waiting spot
  const handleLeaveWaitingSpot = useCallback((waitingSpot: any) => {
    console.log('Leave waiting spot:', waitingSpot.name);
    setRecommendations({});
    setActiveTab(null);
    clearRefreshInterval();
  }, [clearRefreshInterval]);

  // Handle option click
  const handleOptionPress = (option: TransitOption) => {
    dispatch({ type: 'SET_UI_STATE', payload: { selectedTransitOption: option } });
  };

  // Manual refresh
  const handleRefresh = useCallback(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Listen for entering/leaving waiting spot
  useEffect(() => {
    if (location.isInWaitingSpot && location.activeWaitingSpot) {
      handleEnterWaitingSpot(location.activeWaitingSpot);
      loadRecommendations();
      setupRefreshInterval();
    } else {
      if (location.activeWaitingSpot) {
        handleLeaveWaitingSpot(location.activeWaitingSpot);
      }
      clearRefreshInterval();
    }

    return () => {
      clearRefreshInterval();
    };
  }, [location.isInWaitingSpot, location.activeWaitingSpot, handleEnterWaitingSpot, handleLeaveWaitingSpot, loadRecommendations, setupRefreshInterval, clearRefreshInterval]);

  // If not at waiting spot, show empty state
  if (!location.isInWaitingSpot || !location.activeWaitingSpot) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Waiting for Smart Recommendations</Text>
        <Text style={styles.emptySubtitle}>
          When you enter the designated waiting spot, the system will automatically recommend the most suitable transportation
        </Text>
      </View>
    );
  }

  // If no valid travel plans
  const planIds = Object.keys(recommendations);
  if (planIds.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Travel Plans</Text>
        <Text style={styles.emptySubtitle}>
          No active travel plans for the current time period, or no available transit options
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header information */}
      <View style={styles.header}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color="#007AFF" />
          <Text style={styles.locationName}>{location.activeWaitingSpot.name}</Text>
        </View>
        <View style={styles.refreshInfo}>
          {lastUpdate && (
            <Text style={styles.lastUpdateText}>
              {formatTimeAgo(lastUpdate)}
            </Text>
          )}
          <TouchableOpacity onPress={handleRefresh} disabled={isLoading}>
            <Ionicons 
              name="refresh" 
              size={20} 
              color={isLoading ? "#ccc" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      {planIds.length > 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          {planIds.map((planId: string) => {
            const plan = state.travelPlans.find((p: TravelPlan) => p.id === planId);
            if (!plan) return null;

            return (
              <TouchableOpacity
                key={planId}
                style={[styles.tab, activeTab === planId && styles.activeTab]}
                onPress={() => setActiveTab(planId)}
              >
                <Text style={[
                  styles.tabText, 
                  activeTab === planId && styles.activeTabText
                ]}>
                  {plan.name}
                </Text>
                <View style={styles.optionCount}>
                  <Text style={styles.optionCountText}>
                    {recommendations[planId]?.length || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Recommendations list */}
      <ScrollView
        style={styles.recommendationsList}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {planIds.length === 1 && (
          <View style={styles.singlePlanHeader}>
            <Text style={styles.planTitle}>
              {state.travelPlans.find((p: TravelPlan) => p.id === planIds[0])?.name}
            </Text>
          </View>
        )}

        {activeTab && recommendations[activeTab] ? (
          recommendations[activeTab].map((option, index) => (
            <TransitOptionCard
              key={option.id}
              option={option}
              onPress={() => handleOptionPress(option)}
              isSelected={state.ui.selectedTransitOption?.id === option.id}
            />
          ))
        ) : (
          <View style={styles.noOptionsContainer}>
            <Ionicons name="bus-outline" size={48} color="#ccc" />
            <Text style={styles.noOptionsText}>No available transit options</Text>
          </View>
        )}
      </ScrollView>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      )}
    </View>
  );
}

// Transit option card component
interface TransitOptionCardProps {
  option: TransitOption;
  onPress: () => void;
  isSelected: boolean;
}

function TransitOptionCard({ option, onPress, isSelected }: TransitOptionCardProps) {
  const arrivalMinutes = Math.ceil((option.arrivalTime.getTime() - Date.now()) / 60000);
  const isArriving = arrivalMinutes <= 2;
  const isPast = arrivalMinutes < 0;

  return (
    <TouchableOpacity 
      style={[styles.optionCard, isSelected && styles.selectedOptionCard]} 
      onPress={onPress}
      disabled={isPast}
    >
      <View style={styles.optionHeader}>
        <View style={styles.transitInfo}>
          <View style={[styles.transitIcon, { backgroundColor: getTransitColor(option.type) }]}>
            <Ionicons name={getTransitIcon(option.type)} size={20} color="white" />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{option.line}</Text>
            <Text style={styles.direction}>{option.direction}</Text>
          </View>
        </View>
        
        <View style={styles.timingInfo}>
          <Text style={[
            styles.arrivalTime, 
            isArriving && styles.arrivingTime,
            isPast && styles.pastTime
          ]}>
            {isPast ? 'Missed' : isArriving ? 'Arriving Soon' : `${arrivalMinutes} minutes`}
          </Text>
          <Text style={styles.exactTime}>
            {option.arrivalTime.toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>

      <View style={styles.optionDetails}>
        <Text style={styles.stopName}>📍 {option.stopName}</Text>
        <Text style={styles.destination}>🎯 To {option.destination}</Text>
        <Text style={styles.travelTime}>⏱️ Estimated {option.estimatedTravelTime} minutes to arrive</Text>
      </View>

      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Helper functions
const getTransitIcon = (type: string) => {
  switch (type) {
    case 'bus': return 'bus';
    case 'train': return 'train';
    case 'lightrail': return 'subway';
    default: return 'location';
  }
};

const getTransitColor = (type: string) => {
  switch (type) {
    case 'bus': return '#FF9500';
    case 'train': return '#007AFF';
    case 'lightrail': return '#34C759';
    default: return '#666';
  }
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just updated';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  refreshInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  tabContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  optionCount: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  optionCountText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  singlePlanHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  recommendationsList: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  selectedOptionCard: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  direction: {
    fontSize: 14,
    color: '#666',
  },
  timingInfo: {
    alignItems: 'flex-end',
  },
  arrivalTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  arrivingTime: {
    color: '#FF3B30',
  },
  pastTime: {
    color: '#999',
  },
  exactTime: {
    fontSize: 12,
    color: '#999',
  },
  optionDetails: {
    marginBottom: 8,
  },
  stopName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  destination: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  travelTime: {
    fontSize: 14,
    color: '#666',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  noOptionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noOptionsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});