import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { AppContext } from '../../contexts/AppContext';
import { useShakeToPurchase } from '../../hooks/useShakeToPurchase';
import { Ticket } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

export function TicketDisplay() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('TicketDisplay must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const shake = useShakeToPurchase();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [animatedValue] = useState(new Animated.Value(0));

  // Get currently displayed ticket
  const currentTicket = selectedTicket || getCurrentTicket(state.tickets);

  // Get current valid ticket
  function getCurrentTicket(tickets: Ticket[]): Ticket | null {
    return tickets
      .filter(ticket => ticket.status === 'purchased' && new Date() < ticket.validUntil)
      .sort((a, b) => a.purchaseTime.getTime() - b.purchaseTime.getTime())[0] || null;
  }

  // Animation effect
  useEffect(() => {
    if (state.ui.showTicket && currentTicket) {
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      animatedValue.setValue(0);
    }
  }, [state.ui.showTicket, currentTicket]);

  // Handle successful boarding
  const handleBoardSuccess = () => {
    if (!currentTicket) return;

    Alert.alert(
      'Confirm Boarding',
      'Confirm that you have successfully boarded? The ticket will be marked as used.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Boarding',
          onPress: () => {
            const updatedTicket: Ticket = {
              ...currentTicket,
              status: 'used',
            };
            
            dispatch({ type: 'UPDATE_TICKET', payload: updatedTicket });
            dispatch({ type: 'SET_UI_STATE', payload: { showTicket: false, selectedTransitOption: null } });
            
            Alert.alert('Have a pleasant journey!', 'Ticket has been marked as used');
          }
        }
      ]
    );
  };

  // Handle missed service
  const handleMissed = () => {
    if (!currentTicket) return;

    Alert.alert(
      'Missed the Service',
      'Sorry you missed this bus. We will search for the next bus for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Search Again',
          onPress: () => {
            // Reload recommendations
            dispatch({ type: 'SET_UI_STATE', payload: { showTicket: false } });
            // Here can trigger research logic
          }
        }
      ]
    );
  };

  // Close ticket display
  const handleClose = () => {
    dispatch({ type: 'SET_UI_STATE', payload: { showTicket: false } });
  };

  // Show ticket history
  const showTicketHistory = () => {
    // Here can open ticket history page
    console.log('Show ticket history');
  };

  if (!state.ui.showTicket || !currentTicket) {
    return null;
  }

  const timeUntilArrival = Math.ceil((currentTicket.transitOption.arrivalTime.getTime() - Date.now()) / 60000);
  const isArriving = timeUntilArrival <= 3;
  const hasArrived = timeUntilArrival <= 0;

  return (
    <Modal
      visible={state.ui.showTicket}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [{
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              })
            }],
            opacity: animatedValue,
          }
        ]}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Tickets</Text>
            <TouchableOpacity onPress={showTicketHistory} style={styles.historyButton}>
              <Ionicons name="time-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Ticket Card */}
          <View style={styles.ticketCard}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              <View style={styles.routeInfo}>
                <View style={[styles.routeIcon, { backgroundColor: getTransitColor(currentTicket.transitOption.type) }]}>
                  <Ionicons 
                    name={getTransitIcon(currentTicket.transitOption.type)} 
                    size={24} 
                    color="white" 
                  />
                </View>
                <View style={styles.routeDetails}>
                  <Text style={styles.routeName}>{currentTicket.transitOption.line}</Text>
                  <Text style={styles.direction}>{currentTicket.transitOption.direction}</Text>
                </View>
              </View>
              
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {getStatusText(currentTicket.status)}
                </Text>
              </View>
            </View>

            {/* QR Code */}
            <View style={styles.qrCodeContainer}>
              {currentTicket.qrCode ? (
                <>
                  <QRCode
                    value={currentTicket.qrCode}
                    size={screenWidth * 0.6}
                    backgroundColor="white"
                    color="black"
                  />
                  <Text style={styles.qrCodeLabel}>Please show this QR code when boarding</Text>
                </>
              ) : (
                <View style={styles.qrCodePlaceholder}>
                  <Ionicons name="qr-code-outline" size={screenWidth * 0.3} color="#ccc" />
                  <Text style={styles.qrCodeLabel}>QR code loading...</Text>
                </View>
              )}
            </View>

            {/* Ticket Details */}
            <View style={styles.ticketDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Boarding Stop</Text>
                <Text style={styles.detailValue}>{currentTicket.transitOption.stopName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="flag-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Destination</Text>
                <Text style={styles.detailValue}>{currentTicket.transitOption.destination}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Estimated Arrival</Text>
                <Text style={styles.detailValue}>
                  {currentTicket.transitOption.arrivalTime.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Ticket Price</Text>
                <Text style={styles.detailValue}>${currentTicket.price.toFixed(2)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Purchase Time</Text>
                <Text style={styles.detailValue}>
                  {currentTicket.purchaseTime.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Arrival Status */}
          <View style={styles.arrivalStatus}>
            {hasArrived ? (
              <>
                <Ionicons name="checkmark-circle" size={32} color="#34C759" />
                <Text style={styles.arrivedText}>Bus has arrived</Text>
                <Text style={styles.arrivedSubtext}>Please prepare to board and show QR code</Text>
              </>
            ) : isArriving ? (
              <>
                <Ionicons name="time" size={32} color="#FF9500" />
                <Text style={styles.arrivingText}>Arriving Soon</Text>
                <Text style={styles.arrivingSubtext}>{timeUntilArrival} minutes remaining</Text>
              </>
            ) : (
              <>
                <Ionicons name="hourglass" size={32} color="#007AFF" />
                <Text style={styles.waitingText}>Waiting</Text>
                <Text style={styles.waitingSubtext}>{timeUntilArrival} minutes until arrival</Text>
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.successButton]}
              onPress={handleBoardSuccess}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Successfully Boarded</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.missedButton]}
              onPress={handleMissed}
            >
              <Ionicons name="close-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Missed Bus</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <Text style={styles.infoTitle}>Important Notes</Text>
            <Text style={styles.infoText}>• Please actively show the QR code to the driver for scanning when boarding</Text>
            <Text style={styles.infoText}>• Ticket valid until {currentTicket.validUntil.toLocaleString('en-US')}</Text>
            <Text style={styles.infoText}>• Please contact customer service if you have any questions</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
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

const getStatusText = (status: string) => {
  switch (status) {
    case 'purchased': return 'Valid';
    case 'used': return 'Used';
    case 'expired': return 'Expired';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  routeDetails: {
    flex: 1,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  direction: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  qrCodePlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  ticketDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  arrivalStatus: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  arrivedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 12,
    marginBottom: 4,
  },
  arrivedSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  arrivingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9500',
    marginTop: 12,
    marginBottom: 4,
  },
  arrivingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 12,
    marginBottom: 4,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  missedButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  additionalInfo: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});