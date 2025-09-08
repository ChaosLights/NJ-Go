import { useState, useEffect, useContext, useCallback } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { shakeDetectionService, ShakeDetectionOptions } from '../services/ShakeDetectionService';
import { ticketPurchaseService } from '../services/TicketPurchaseService';
import { AppContext } from '../contexts/AppContext';
import { TransitOption, Ticket } from '../types';

export interface UseShakeToPurchaseOptions extends ShakeDetectionOptions {
  enabled?: boolean;
  showConfirmation?: boolean;
  autoEnable?: boolean; // Automatically enable when transit option is selected
}

export function useShakeToPurchase(options: UseShakeToPurchaseOptions = {}) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useShakeToPurchase must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const [isEnabled, setIsEnabled] = useState(options.enabled || false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lastPurchaseTime, setLastPurchaseTime] = useState<Date | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const {
    showConfirmation = true,
    autoEnable = true,
    ...shakeOptions
  } = options;

  // Configure shake detection
  useEffect(() => {
    if (Object.keys(shakeOptions).length > 0) {
      shakeDetectionService.configure(shakeOptions);
    }
  }, [shakeOptions]);

  // Auto enable/disable (when there is a selected transit option)
  useEffect(() => {
    if (autoEnable) {
      const hasSelectedOption = !!state.ui.selectedTransitOption;
      setIsEnabled(hasSelectedOption);
    }
  }, [autoEnable, state.ui.selectedTransitOption]);

  // Handle shake events
  const handleShake = useCallback(async () => {
    const selectedOption = state.ui.selectedTransitOption;
    
    if (!selectedOption) {
      Alert.alert('Notice', 'Please select a transit option first');
      return;
    }

    if (isPurchasing) {
      console.log('Purchase in progress, ignoring shake');
      return;
    }

    // Clear previous errors
    setPurchaseError(null);

    try {
      if (showConfirmation) {
        // Show confirmation dialog
        Alert.alert(
          'Confirm Purchase',
          `Are you sure you want to purchase a ticket for ${selectedOption.line}?\n\nStop: ${selectedOption.stopName}\nEstimated Arrival: ${selectedOption.arrivalTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}\nDestination: ${selectedOption.destination}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Purchase',
              onPress: () => performPurchase(selectedOption),
            },
          ]
        );
      } else {
        // Direct purchase
        await performPurchase(selectedOption);
      }
    } catch (error) {
      console.error('Failed to handle shake purchase:', error);
    }
  }, [state.ui.selectedTransitOption, isPurchasing, showConfirmation]);

  // Execute purchase
  const performPurchase = async (transitOption: TransitOption) => {
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      console.log('Starting shake-to-purchase:', transitOption.line);

      // Trigger haptic feedback (non-web platforms only)
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await ticketPurchaseService.purchaseTicket(transitOption);

      if (result.success && result.ticket) {
        // Purchase successful
        setLastPurchaseTime(new Date());
        
        // Add ticket to global state
        dispatch({ type: 'ADD_TICKET', payload: result.ticket });
        
        // Show ticket
        dispatch({ 
          type: 'SET_UI_STATE', 
          payload: { showTicket: true } 
        });

        // Success feedback (non-web platforms only)
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Alert.alert(
          'Purchase Successful!',
          `Successfully purchased ${transitOption.line} ticket\n\nPlease show the QR code when boarding`,
          [
            {
              text: 'View Ticket',
              onPress: () => {
                dispatch({ 
                  type: 'SET_UI_STATE', 
                  payload: { showTicket: true } 
                });
              }
            }
          ]
        );

      } else {
        // Purchase failed
        setPurchaseError(result.error || 'Purchase failed');
        
        // Failure feedback (non-web platforms only)
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Vibration.vibrate([0, 200, 100, 200]); // Failure vibration pattern
        }

        Alert.alert(
          'Purchase Failed',
          result.error || 'An error occurred during purchase, please try again later',
          [
            {
              text: 'Retry',
              onPress: () => performPurchase(transitOption),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            }
          ]
        );
      }

    } catch (error) {
      console.error('Purchase process failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      setPurchaseError(errorMessage);
      
      // Error feedback (non-web platforms only)
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Manual purchase (no shake required)
  const manualPurchase = useCallback(async (transitOption?: TransitOption) => {
    const optionToPurchase = transitOption || state.ui.selectedTransitOption;
    if (!optionToPurchase) {
      Alert.alert('Notice', 'Please select a transit option first');
      return;
    }

    await performPurchase(optionToPurchase);
  }, [state.ui.selectedTransitOption]);

  // Enable/disable shake detection
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Manage shake listening
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (isEnabled) {
      // Start listening for shakes
      const stopListening = shakeDetectionService.startListening();
      const unsubscribeShake = shakeDetectionService.onShake(handleShake);
      
      cleanup = () => {
        stopListening();
        unsubscribeShake();
      };

      console.log('Shake-to-purchase enabled');
    } else {
      // Stop listening
      shakeDetectionService.stopListening();
      console.log('Shake-to-purchase disabled');
    }

    return cleanup || undefined;
  }, [isEnabled, handleShake]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      shakeDetectionService.stopListening();
    };
  }, []);

  // Get shake detection status
  const shakeStatus = shakeDetectionService.getStatus();

  return {
    // State
    isEnabled,
    isPurchasing,
    lastPurchaseTime,
    purchaseError,
    
    // Shake detection status
    isListening: shakeStatus.isListening,
    recentShakeCount: shakeStatus.recentShakeCount,
    isInCooldown: shakeStatus.isInCooldown,
    
    // Control methods
    enable,
    disable,
    toggle,
    manualPurchase,
    
    // Test methods
    manualTrigger: () => {
      if (isEnabled) {
        handleShake();
      }
    },
    
    // Clear error
    clearError: () => setPurchaseError(null),
    
    // Get currently selected option
    selectedOption: state.ui.selectedTransitOption,
    
    // Check if purchase is available
    canPurchase: !isPurchasing && !!state.ui.selectedTransitOption,
  };
}

// Simplified version of Hook, auto-enable shake-to-purchase
export function useAutoShakeToPurchase(options: Omit<UseShakeToPurchaseOptions, 'enabled' | 'autoEnable'> = {}) {
  return useShakeToPurchase({
    ...options,
    enabled: true,
    autoEnable: true,
  });
}