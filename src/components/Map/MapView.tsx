import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { MapRegion, MapMarker, Location } from '../../types';

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
  const mapRef = useRef<MapView>(null);

  const handleRegionChangeComplete = (newRegion: Region) => {
    if (onRegionChange) {
      onRegionChange({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
        latitudeDelta: newRegion.latitudeDelta,
        longitudeDelta: newRegion.longitudeDelta,
      });
    }
  };

  const handleMapPress = (event: any) => {
    if (onMapPress) {
      onMapPress(event.nativeEvent.coordinate);
    }
  };

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        mapType="standard"
        loadingEnabled={true}
        loadingBackgroundColor="#ffffff"
        moveOnMarkerPress={false}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={getMarkerColor(marker.type)}
            onPress={() => onMarkerPress?.(marker)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});