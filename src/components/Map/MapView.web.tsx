import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Loader } from '@googlemaps/js-api-loader';
import { MapRegion, MapMarker, Location } from '../../types';
import { config } from '../../config';

interface NJGoMapViewProps {
  region: MapRegion;
  markers: MapMarker[];
  onRegionChange?: (region: MapRegion) => void;
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (coordinate: Location) => void;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
}

export function NJGoMapView({
  region,
  markers,
  onRegionChange,
  onMarkerPress,
  onMapPress,
  showsUserLocation = true,
  followsUserLocation = false,
}: NJGoMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const initializeMap = async () => {
      if (!config.googleMapsApiKey) {
        setError('Google Maps API Key 未配置');
        setIsLoading(false);
        return;
      }

      try {
        const loader = new Loader({
          apiKey: config.googleMapsApiKey,
          version: 'weekly',
        });

        const google = await loader.load();
        
        if (mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: region.latitude, lng: region.longitude },
            zoom: 12,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: false,
          });

          googleMapRef.current = map;

          // 地图点击事件
          if (onMapPress) {
            map.addListener('click', (event: google.maps.MapMouseEvent) => {
              const latLng = event.latLng;
              if (latLng) {
                onMapPress({
                  latitude: latLng.lat(),
                  longitude: latLng.lng(),
                });
              }
            });
          }

          // 地图区域变化事件
          if (onRegionChange) {
            map.addListener('idle', () => {
              const center = map.getCenter();
              const bounds = map.getBounds();
              if (center && bounds) {
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                onRegionChange({
                  latitude: center.lat(),
                  longitude: center.lng(),
                  latitudeDelta: Math.abs(ne.lat() - sw.lat()),
                  longitudeDelta: Math.abs(ne.lng() - sw.lng()),
                });
              }
            });
          }

          // 用户位置标记
          if (showsUserLocation) {
            new google.maps.Marker({
              position: { lat: region.latitude, lng: region.longitude },
              map: map,
              title: '您的位置',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error('初始化Google Maps失败:', err);
        setError('地图加载失败');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, []);

  // 更新地图中心
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: region.latitude, lng: region.longitude });
    }
  }, [region]);

  // 更新标记
  useEffect(() => {
    if (!googleMapRef.current) return;

    // 清除旧标记
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 添加新标记
    markers.forEach(marker => {
      const googleMarker = new google.maps.Marker({
        position: { lat: marker.coordinate.latitude, lng: marker.coordinate.longitude },
        map: googleMapRef.current,
        title: marker.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getMarkerColor(marker.type),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      if (onMarkerPress) {
        googleMarker.addListener('click', () => {
          onMarkerPress(marker);
        });
      }

      // 添加信息窗口
      if (marker.description) {
        const infoWindow = new google.maps.InfoWindow({
          content: `<div><h3>${marker.title}</h3><p>${marker.description}</p></div>`,
        });

        googleMarker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, googleMarker);
        });
      }

      markersRef.current.push(googleMarker);
    });
  }, [markers, onMarkerPress]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ 地图加载失败</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            请检查 Google Maps API Key 是否正确配置
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🗺️ 正在加载地图...</Text>
        </View>
      )}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          display: isLoading ? 'none' : 'block',
        }}
      />
    </View>
  );
}

const getMarkerColor = (type: string) => {
  switch (type) {
    case 'destination':
      return '#FF6B6B'; // 红色 - 目的地
    case 'waitingSpot':
      return '#4ECDC4'; // 青色 - 等车地点
    case 'transitStop':
      return '#45B7D1'; // 蓝色 - 公交站
    default:
      return '#96CEB4'; // 绿色 - 默认
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});