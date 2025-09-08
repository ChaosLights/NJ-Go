import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransitStop, Location } from '../../types';
import { config } from '../../config';

interface TransitStopSearchProps {
  visible: boolean;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    radius: number;
  } | null;
  onClose: () => void;
  onSelect: (stop: TransitStop) => void;
}

export function TransitStopSearch({ 
  visible, 
  location, 
  onClose, 
  onSelect 
}: TransitStopSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [nearbyStops, setNearbyStops] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'search'>('nearby');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 加载附近的公交站
  useEffect(() => {
    if (visible && location && activeTab === 'nearby') {
      loadNearbyStops();
    }
  }, [visible, location, activeTab]);

  const loadNearbyStops = async () => {
    if (!location) return;

    setIsLoadingNearby(true);
    try {
      // 使用 Google Places API 搜索附近的公交站
      const stops = await searchNearbyTransitStops({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setNearbyStops(stops);
    } catch (error) {
      console.error('加载附近公交站失败:', error);
      Alert.alert('错误', '无法加载附近的公交站');
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const searchNearbyTransitStops = async (center: Location): Promise<any[]> => {
    if (!config.googleMapsApiKey) {
      throw new Error('Google Maps API Key 未配置');
    }

    // 搜索附近的公交站
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.latitude},${center.longitude}&radius=1000&type=transit_station&key=${config.googleMapsApiKey}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error_message || '搜索附近公交站失败');
    }

    // 转换为我们的数据格式
    return data.results.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: determineTransitType(place),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      lines: [], // 需要额外调用API获取路线信息
      distance: calculateDistance(center, {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }),
      rating: place.rating || 0,
      vicinity: place.vicinity,
    }));
  };

  const handleSearch = async (query: string) => {
    setSearchText(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // 清除之前的搜索
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // 延迟搜索
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchTransitStops(query, location);
        setSearchResults(results);
      } catch (error) {
        console.error('搜索失败:', error);
        Alert.alert('搜索失败', '请检查网络连接后重试');
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const searchTransitStops = async (query: string, center?: any): Promise<any[]> => {
    if (!config.googleMapsApiKey) {
      throw new Error('Google Maps API Key 未配置');
    }

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' transit station')}&key=${config.googleMapsApiKey}`;
    
    if (center) {
      url += `&location=${center.latitude},${center.longitude}&radius=5000`;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error_message || '搜索失败');
    }

    return data.results.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      type: determineTransitType(place),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      lines: [],
      distance: center ? calculateDistance(center, {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }) : 0,
      formatted_address: place.formatted_address,
    }));
  };

  const determineTransitType = (place: any): 'bus' | 'train' | 'lightrail' => {
    const types = place.types || [];
    const name = (place.name || '').toLowerCase();

    if (types.includes('subway_station') || name.includes('subway') || name.includes('metro')) {
      return 'lightrail';
    }
    if (types.includes('train_station') || name.includes('train') || name.includes('station')) {
      return 'train';
    }
    return 'bus';
  };

  const calculateDistance = (point1: Location, point2: Location): number => {
    const R = 6371000; // 地球半径（米）
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLng = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const handleStopSelect = async (stop: any) => {
    try {
      // 尝试获取更详细的信息（如路线等）
      const detailedStop = await getStopDetails(stop);
      
      const transitStop: TransitStop = {
        id: detailedStop.id || stop.id,
        name: detailedStop.name || stop.name,
        type: detailedStop.type || stop.type,
        latitude: detailedStop.latitude || stop.latitude,
        longitude: detailedStop.longitude || stop.longitude,
        lines: detailedStop.lines || [],
        stopCode: detailedStop.stopCode,
      };

      onSelect(transitStop);
    } catch (error) {
      console.error('获取站点详情失败:', error);
      // 如果获取详情失败，仍然使用基础信息
      const transitStop: TransitStop = {
        id: stop.id,
        name: stop.name,
        type: stop.type,
        latitude: stop.latitude,
        longitude: stop.longitude,
        lines: [],
      };
      onSelect(transitStop);
    }
  };

  const getStopDetails = async (stop: any): Promise<any> => {
    // 这里应该调用 NJ Transit API 或其他公交API获取详细信息
    // 目前返回基础信息
    return {
      ...stop,
      lines: ['Route 1', 'Route 2'], // 模拟数据
    };
  };

  const renderStopItem = ({ item: stop }: { item: any }) => (
    <TouchableOpacity
      style={styles.stopItem}
      onPress={() => handleStopSelect(stop)}
    >
      <View style={styles.stopIcon}>
        <Ionicons
          name={getTransitIcon(stop.type)}
          size={24}
          color={getTransitColor(stop.type)}
        />
      </View>
      
      <View style={styles.stopInfo}>
        <Text style={styles.stopName}>{stop.name}</Text>
        <Text style={styles.stopAddress}>
          {stop.vicinity || stop.formatted_address}
        </Text>
        {stop.distance !== undefined && (
          <Text style={styles.stopDistance}>
            距离: {stop.distance}m
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  const getTransitIcon = (type: string) => {
    switch (type) {
      case 'bus':
        return 'bus';
      case 'train':
        return 'train';
      case 'lightrail':
        return 'subway';
      default:
        return 'location';
    }
  };

  const getTransitColor = (type: string) => {
    switch (type) {
      case 'bus':
        return '#FF9500';
      case 'train':
        return '#007AFF';
      case 'lightrail':
        return '#34C759';
      default:
        return '#666';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>添加公交站</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>
              附近站点
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              搜索站点
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar (only show in search tab) */}
        {activeTab === 'search' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索公交站、火车站..."
                value={searchText}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'nearby' ? (
            // Nearby stops
            <>
              {isLoadingNearby ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>正在加载附近的公交站...</Text>
                </View>
              ) : nearbyStops.length > 0 ? (
                <FlatList
                  data={nearbyStops}
                  renderItem={renderStopItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.list}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>附近没有找到公交站</Text>
                  <Text style={styles.emptySubtext}>尝试使用搜索功能</Text>
                </View>
              )}
            </>
          ) : (
            // Search results
            <>
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderStopItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.list}
                />
              ) : searchText.length >= 2 && !isSearching ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>没有找到相关的公交站</Text>
                  <Text style={styles.emptySubtext}>尝试使用不同的关键词</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>搜索公交站点</Text>
                  <Text style={styles.emptySubtext}>输入站点名称或关键词</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
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
  cancelButton: {
    fontSize: 16,
    color: '#999',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  stopDistance: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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