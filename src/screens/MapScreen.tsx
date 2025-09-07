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

// 默认地图区域（新泽西州中心）
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

  // 更新地图标记
  useEffect(() => {
    const newMarkers: MapMarker[] = [];

    // 添加目的地标记
    state.travelPlans.forEach(plan => {
      plan.destinations.forEach(destination => {
        newMarkers.push({
          id: `dest-${destination.id}`,
          coordinate: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
          title: destination.name,
          description: `目的地 - ${destination.address}`,
          type: 'destination',
        });
      });
    });

    // 添加等车地点标记
    state.waitingSpots.forEach(spot => {
      newMarkers.push({
        id: `waiting-${spot.id}`,
        coordinate: {
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        title: spot.name,
        description: `等车地点 - 半径${spot.radius}m`,
        type: 'waitingSpot',
      });

      // 添加等车地点附近的交通站点标记
      spot.transitStops.forEach(stop => {
        newMarkers.push({
          id: `stop-${stop.id}`,
          coordinate: {
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
          title: stop.name,
          description: `${stop.type.toUpperCase()}站 - ${stop.lines.join(', ')}`,
          type: 'transitStop',
        });
      });
    });

    setMarkers(newMarkers);
  }, [state.travelPlans, state.waitingSpots]);

  // 处理地图点击
  const handleMapPress = (coordinate: Location) => {
    Alert.alert(
      '添加地点',
      `坐标: ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '添加目的地',
          onPress: () => handleAddDestination(coordinate),
        },
        {
          text: '添加等车地点',
          onPress: () => handleAddWaitingSpot(coordinate),
        },
      ]
    );
  };

  // 添加目的地
  const handleAddDestination = (coordinate: Location) => {
    // 这里应该打开一个模态框让用户输入详细信息
    // 现在先显示一个提示
    Alert.alert('添加目的地', '请在出行计划中添加目的地详细信息');
  };

  // 添加等车地点
  const handleAddWaitingSpot = (coordinate: Location) => {
    // 这里应该打开一个模态框让用户输入详细信息
    // 现在先显示一个提示
    Alert.alert('添加等车地点', '请设置等车地点详细信息');
  };

  // 处理标记点击
  const handleMarkerPress = (marker: MapMarker) => {
    Alert.alert(
      marker.title,
      marker.description,
      [
        { text: '确定', style: 'default' },
      ]
    );
  };

  // 定位到用户当前位置
  const handleLocationPress = () => {
    if (state.location.current) {
      setRegion({
        latitude: state.location.current.latitude,
        longitude: state.location.current.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert('位置服务', '无法获取当前位置，请检查位置权限设置');
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
      
      {/* 浮动按钮 */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleLocationPress}
        >
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 地图图例 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendText}>目的地</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4ECDC4' }]} />
          <Text style={styles.legendText}>等车地点</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#45B7D1' }]} />
          <Text style={styles.legendText}>交通站点</Text>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  legend: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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