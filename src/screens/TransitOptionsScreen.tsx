import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../contexts/AppContext';

export function TransitOptionsScreen() {
  const { state } = useAppContext();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {state.transitOptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="train-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>暂无交通选项</Text>
            <Text style={styles.emptySubtext}>请在等车地点附近查看实时交通信息</Text>
          </View>
        ) : (
          <View style={styles.optionsList}>
            {/* 将在后续实现交通选项列表 */}
            <Text>交通选项列表将在这里显示</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  optionsList: {
    padding: 20,
  },
});