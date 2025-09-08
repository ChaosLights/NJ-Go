import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../contexts/AppContext';
import { ticketPurchaseService } from '../../services/TicketPurchaseService';
import { Ticket } from '../../types';

interface TicketManagerProps {
  visible: boolean;
  onClose: () => void;
}

export function TicketManager({ visible, onClose }: TicketManagerProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('TicketManager must be used within AppProvider');
  }
  const { state, dispatch } = context;
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter tickets
  const filteredTickets = state.tickets.filter(ticket => {
    switch (selectedFilter) {
      case 'active':
        return ticket.status === 'purchased' && new Date() < ticket.validUntil;
      case 'used':
        return ticket.status === 'used';
      case 'expired':
        return ticket.status === 'expired' || (ticket.status === 'purchased' && new Date() >= ticket.validUntil);
      default:
        return true;
    }
  }).sort((a: Ticket, b: Ticket) => b.purchaseTime.getTime() - a.purchaseTime.getTime());

  // Refresh ticket list
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Here you can call API to refresh ticket status
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  // View ticket details
  const viewTicketDetails = (ticket: Ticket) => {
    dispatch({ type: 'SET_UI_STATE', payload: { showTicket: true } });
    // Here you can set the selected ticket
  };

  // Apply for refund
  const requestRefund = (ticket: Ticket) => {
    if (ticket.status !== 'purchased') {
      Alert.alert('Cannot Refund', 'Only unused tickets can be refunded');
      return;
    }

    const timeUntilDeparture = ticket.transitOption.arrivalTime.getTime() - Date.now();
    if (timeUntilDeparture < 30 * 60 * 1000) { // Within 30 minutes
      Alert.alert('Cannot Refund', 'Cannot refund within 30 minutes before departure');
      return;
    }

    Alert.alert(
      'Apply for Refund',
      `Are you sure you want to refund this ticket?\n\nTicket: ${ticket.transitOption.line}\nAmount: $${ticket.price.toFixed(2)}\n\nRefund may incur processing fees`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply for Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ticketPurchaseService.refundTicket(ticket.id);
              if (result.success) {
                const refundedTicket: Ticket = {
                  ...ticket,
                  status: 'cancelled',
                };
                dispatch({ type: 'UPDATE_TICKET', payload: refundedTicket });
                Alert.alert(
                  'Refund Successful',
                  `Refund amount: $${result.refundAmount?.toFixed(2) || ticket.price.toFixed(2)}\nRefund will be processed within 3-5 business days`
                );
              } else {
                Alert.alert('Refund Failed', result.error || 'Failed to apply for refund, please try again later');
              }
            } catch (error) {
              Alert.alert('Error', 'Error occurred during refund process');
            }
          }
        }
      ]
    );
  };

  const renderTicketItem = ({ item: ticket }: { item: Ticket }) => (
    <TouchableOpacity 
      style={styles.ticketItem}
      onPress={() => viewTicketDetails(ticket)}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.routeInfo}>
          <View style={[styles.routeIcon, { backgroundColor: getTransitColor(ticket.transitOption.type) }]}>
            <Ionicons 
              name={getTransitIcon(ticket.transitOption.type)} 
              size={20} 
              color="white" 
            />
          </View>
          <View style={styles.routeDetails}>
            <Text style={styles.routeName}>{ticket.transitOption.line}</Text>
            <Text style={styles.routeDirection}>{ticket.transitOption.direction}</Text>
          </View>
        </View>
        
        <View style={styles.ticketStatus}>
          <View style={[styles.statusBadge, getStatusStyle(ticket.status)]}>
            <Text style={[styles.statusText, getStatusTextStyle(ticket.status)]}>
              {getStatusDisplayText(ticket.status)}
            </Text>
          </View>
          <Text style={styles.ticketPrice}>${ticket.price.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.ticketDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{ticket.transitOption.stopName}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color="#999" />
        <View style={styles.detailItem}>
          <Ionicons name="flag-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{ticket.transitOption.destination}</Text>
        </View>
      </View>

      <View style={styles.ticketFooter}>
        <Text style={styles.purchaseTime}>
          Purchased on {ticket.purchaseTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <View style={styles.ticketActions}>
          {ticket.status === 'purchased' && (
            <TouchableOpacity 
              style={styles.refundButton}
              onPress={() => requestRefund(ticket)}
            >
              <Text style={styles.refundButtonText}>Refund</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => viewTicketDetails(ticket)}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Tickets</Text>
          <TouchableOpacity onPress={handleRefresh} disabled={isRefreshing}>
            <Ionicons 
              name="refresh" 
              size={24} 
              color={isRefreshing ? "#ccc" : "#007AFF"} 
            />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.activeFilterTab]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.activeFilterText]}>
              All
            </Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{state.tickets.length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'active' && styles.activeFilterTab]}
            onPress={() => setSelectedFilter('active')}
          >
            <Text style={[styles.filterText, selectedFilter === 'active' && styles.activeFilterText]}>
              Valid
            </Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {state.tickets.filter((t: Ticket) => t.status === 'purchased' && new Date() < t.validUntil).length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'used' && styles.activeFilterTab]}
            onPress={() => setSelectedFilter('used')}
          >
            <Text style={[styles.filterText, selectedFilter === 'used' && styles.activeFilterText]}>
              Used
            </Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {state.tickets.filter((t: Ticket) => t.status === 'used').length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'expired' && styles.activeFilterTab]}
            onPress={() => setSelectedFilter('expired')}
          >
            <Text style={[styles.filterText, selectedFilter === 'expired' && styles.activeFilterText]}>
              Expired
            </Text>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {state.tickets.filter((t: Ticket) => t.status === 'expired' || (t.status === 'purchased' && new Date() >= t.validUntil)).length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Ticket List */}
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          style={styles.ticketList}
          contentContainerStyle={styles.ticketListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {selectedFilter === 'all' ? 'No tickets yet' : `No ${getFilterDisplayText(selectedFilter).toLowerCase()} tickets`}
              </Text>
              <Text style={styles.emptySubtext}>
                Tickets will appear here after purchase
              </Text>
            </View>
          }
        />
      </View>
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

const getStatusDisplayText = (status: string) => {
  switch (status) {
    case 'purchased': return 'Valid';
    case 'used': return 'Used';
    case 'expired': return 'Expired';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'purchased': return { backgroundColor: '#34C759' };
    case 'used': return { backgroundColor: '#007AFF' };
    case 'expired': return { backgroundColor: '#999' };
    case 'cancelled': return { backgroundColor: '#FF3B30' };
    default: return { backgroundColor: '#666' };
  }
};

const getStatusTextStyle = (status: string) => {
  return { color: 'white' };
};

const getFilterDisplayText = (filter: string) => {
  switch (filter) {
    case 'active': return 'valid';
    case 'used': return 'used';
    case 'expired': return 'expired';
    default: return '';
  }
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  filterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  ticketList: {
    flex: 1,
  },
  ticketListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  ticketItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeDetails: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  routeDirection: {
    fontSize: 14,
    color: '#666',
  },
  ticketStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ticketDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  purchaseTime: {
    fontSize: 12,
    color: '#999',
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refundButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  refundButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  detailsButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});