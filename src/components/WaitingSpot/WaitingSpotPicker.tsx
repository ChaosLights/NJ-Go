import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { NJGoMapView } from '../Map/MapView';
import { Location, MapRegion, MapMarker } from '../../types';
import { config } from '../../config';

interface WaitingSpotPickerProps {
  visible: boolean;
  initialLocation?: {
    latitude: number;
    longitude: number;
    name: string;
    radius: number;
  } | null;
  onClose: () => void;
  onSelect: (location: {
    latitude: number;
    longitude: number;
    name: string;
    radius: number;
  }) => void;
}

export function WaitingSpotPicker({ 
  visible, 
  initialLocation, 
  onClose, 
  onSelect 
}: WaitingSpotPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation ? {
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    } : null
  );
  const [locationName, setLocationName] = useState(initialLocation?.name || '');
  const [radius, setRadius] = useState(initialLocation?.radius || 50);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: initialLocation?.latitude || config.defaultMapRegion.latitude,
    longitude: initialLocation?.longitude || config.defaultMapRegion.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markers, setMarkers] = useState<MapMarker[]>(
    initialLocation ? [{
      id: 'selected',
      coordinate: {
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      },
      title: initialLocation.name,
      description: `半径: ${initialLocation.radius}m`,
      type: 'waitingSpot',
    }] : []
  );

  const handleMapPress = async (coordinate: Location) => {
    setSelectedLocation(coordinate);
    setMapRegion({
      ...mapRegion,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });

    // 如果没有自定义名称，尝试获取地址
    let name = locationName;
    if (!name.trim()) {
      try {
        const address = await reverseGeocode(coordinate);
        name = address.name || `位置 ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
        setLocationName(name);
      } catch (error) {
        console.error('反向地理编码失败:', error);
        name = `位置 ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
        setLocationName(name);
      }
    }

    // 更新地图标记
    const marker: MapMarker = {
      id: 'selected',
      coordinate,
      title: name,
      description: `半径: ${radius}m`,
      type: 'waitingSpot',
    };
    setMarkers([marker]);
  };

  const reverseGeocode = async (coordinate: Location): Promise<any> => {
    if (!config.googleMapsApiKey) {
      throw new Error('Google Maps API Key 未配置');
    }

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

  const handleRadiusChange = (newRadius: number) => {
    setRadius(Math.round(newRadius));
    
    // 更新标记描述
    if (markers.length > 0) {
      const updatedMarkers = markers.map(marker => ({
        ...marker,
        description: `半径: ${Math.round(newRadius)}m`,
      }));
      setMarkers(updatedMarkers);
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert('错误', '请在地图上选择一个位置');
      return;
    }

    if (!locationName.trim()) {
      Alert.alert('错误', '请输入等车地点名称');
      return;
    }

    onSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      name: locationName.trim(),
      radius,
    });

    handleClose();
  };

  const handleClose = () => {
    // 重置状态
    if (!initialLocation) {
      setSelectedLocation(null);
      setLocationName('');
      setRadius(50);
      setMarkers([]);
    }
    onClose();
  };

  const getCurrentLocation = async () => {
    try {
      // 这里应该使用真实的位置服务
      // 暂时使用默认位置
      const currentLocation = {
        latitude: config.defaultMapRegion.latitude,
        longitude: config.defaultMapRegion.longitude,
      };
      
      await handleMapPress(currentLocation);
      
      setMapRegion({
        ...mapRegion,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('获取当前位置失败:', error);
      Alert.alert('错误', '无法获取当前位置');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.title}>选择等车位置</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={[
              styles.confirmButton, 
              !selectedLocation && styles.confirmButtonDisabled
            ]}>
              确认
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.nameInput}
            placeholder="输入等车地点名称"
            value={locationName}
            onChangeText={setLocationName}
            returnKeyType="done"
          />
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Radius Slider */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>检测半径: {radius}m</Text>
          <Slider
            style={styles.slider}
            minimumValue={20}
            maximumValue={200}
            value={radius}
            onValueChange={handleRadiusChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#007AFF"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>20m</Text>
            <Text style={styles.sliderLabelText}>200m</Text>
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <NJGoMapView
            region={mapRegion}
            markers={markers}
            onRegionChange={setMapRegion}
            onMapPress={handleMapPress}
            showsUserLocation={true}
          />
          
          {/* Instructions */}
          {!selectedLocation && (
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                在地图上点击选择等车位置
              </Text>
              <Text style={styles.instructionSubtext}>
                系统会在您进入此位置{radius}m范围内时自动激活
              </Text>
            </View>
          )}

          {/* Radius Circle Overlay */}
          {selectedLocation && (
            <View style={styles.radiusIndicator}>
              <Text style={styles.radiusText}>
                半径 {radius}m
              </Text>
            </View>
          )}
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <View style={styles.locationDetails}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <View style={styles.locationText}>
                <Text style={styles.locationName}>{locationName || '等车地点'}</Text>
                <Text style={styles.locationCoords}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
        )}
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
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    color: '#ccc',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    color: '#333',
  },
  currentLocationButton: {
    padding: 8,
    marginLeft: 8,
  },
  sliderContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#999',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  instructions: {
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
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  radiusIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  radiusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  locationInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationDetails: {
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
  locationCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});