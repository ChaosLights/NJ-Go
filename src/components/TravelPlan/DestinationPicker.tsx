import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NJGoMapView } from '../Map/MapView';
import { AppContext } from '../../contexts/AppContext';
import { Destination, Location, MapRegion, MapMarker } from '../../types';
import { config } from '../../config';

interface DestinationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (destination: Destination) => void;
}

export function DestinationPicker({ visible, onClose, onSelect }: DestinationPickerProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('DestinationPicker must be used within AppProvider');
  }
  const { state } = context;
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: config.defaultMapRegion.latitude,
    longitude: config.defaultMapRegion.longitude,
    latitudeDelta: config.defaultMapRegion.latitudeDelta,
    longitudeDelta: config.defaultMapRegion.longitudeDelta,
  });
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
        const results = await searchPlaces(query);
        setSearchResults(results);
      } catch (error) {
        console.error('搜索失败:', error);
        Alert.alert('搜索失败', '请检查网络连接后重试');
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const searchPlaces = async (query: string): Promise<any[]> => {
    // 使用 Google Places API 搜索
    if (!config.googleMapsApiKey) {
      throw new Error('Google Maps API Key 未配置');
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${mapRegion.latitude},${mapRegion.longitude}&radius=50000&key=${config.googleMapsApiKey}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error_message || '搜索失败');
    }

    return data.results || [];
  };

  const handlePlaceSelect = (place: any) => {
    const location: Location = {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    };

    setSelectedLocation(location);
    setMapRegion({
      ...mapRegion,
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // 更新地图标记
    const marker: MapMarker = {
      id: 'selected',
      coordinate: location,
      title: place.name,
      description: place.formatted_address,
      type: 'destination',
    };
    setMarkers([marker]);

    // 清空搜索结果
    setSearchResults([]);
    setSearchText(place.name);
  };

  const handleMapPress = async (coordinate: Location) => {
    setSelectedLocation(coordinate);
    
    // 使用反向地理编码获取地址信息
    try {
      const address = await reverseGeocode(coordinate);
      const marker: MapMarker = {
        id: 'selected',
        coordinate,
        title: address.name || '选择的位置',
        description: address.formatted_address,
        type: 'destination',
      };
      setMarkers([marker]);
      setSearchText(address.name || `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    } catch (error) {
      console.error('反向地理编码失败:', error);
      const marker: MapMarker = {
        id: 'selected',
        coordinate,
        title: '选择的位置',
        description: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        type: 'destination',
      };
      setMarkers([marker]);
      setSearchText(`${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    }
  };

  const reverseGeocode = async (coordinate: Location): Promise<any> => {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${config.googleMapsApiKey}`
    );

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error_message || '反向地理编码失败');
    }

    const result = data.results[0];
    return {
      name: extractLocationName(result),
      formatted_address: result.formatted_address,
    };
  };

  const extractLocationName = (result: any): string => {
    // 优先使用 establishment 或 point_of_interest
    const nameComponents = result.address_components.filter((comp: any) =>
      comp.types.includes('establishment') || 
      comp.types.includes('point_of_interest')
    );

    if (nameComponents.length > 0) {
      return nameComponents[0].long_name;
    }

    // 其次使用街道号码和街道名称
    const streetNumber = result.address_components.find((comp: any) =>
      comp.types.includes('street_number')
    )?.long_name;
    
    const streetName = result.address_components.find((comp: any) =>
      comp.types.includes('route')
    )?.long_name;

    if (streetNumber && streetName) {
      return `${streetNumber} ${streetName}`;
    }

    if (streetName) {
      return streetName;
    }

    // 最后使用行政区域
    const locality = result.address_components.find((comp: any) =>
      comp.types.includes('locality')
    )?.long_name;

    return locality || '未知位置';
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('错误', '请选择一个位置');
      return;
    }

    const selectedMarker = markers.find(m => m.id === 'selected');
    if (!selectedMarker) {
      Alert.alert('错误', '请选择一个位置');
      return;
    }

    const destination: Destination = {
      id: generateId(),
      name: selectedMarker.title,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: selectedMarker.description || '',
      category: 'custom',
    };

    onSelect(destination);
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setSearchResults([]);
    setSelectedLocation(null);
    setMarkers([]);
    onClose();
  };

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => handlePlaceSelect(item)}
    >
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.formatted_address}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>选择目的地</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}>
              确认
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索地点或输入地址"
              value={searchText}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.place_id}
              style={styles.searchResults}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          <NJGoMapView
            region={mapRegion}
            markers={markers}
            onRegionChange={setMapRegion}
            onMapPress={handleMapPress}
            showsUserLocation={true}
          />
          
          {/* Map Instructions */}
          {!selectedLocation && (
            <View style={styles.mapInstructions}>
              <Text style={styles.instructionText}>
                在地图上点击选择位置，或使用上方搜索栏
              </Text>
            </View>
          )}
        </View>

        {/* Selected Location Info */}
        {selectedLocation && markers.length > 0 && (
          <View style={styles.selectedLocationInfo}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <View style={styles.locationText}>
                <Text style={styles.locationName}>{markers[0].title}</Text>
                <Text style={styles.locationAddress}>{markers[0].description}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

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
  cancelButton: {
    fontSize: 16,
    color: '#999',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    color: '#ccc',
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
  searchResultsContainer: {
    backgroundColor: 'white',
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResults: {
    flex: 1,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapInstructions: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    zIndex: 1,
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  selectedLocationInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
  },
});