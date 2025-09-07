import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { MapScreen } from '../screens/MapScreen';
import { TravelPlanScreen } from '../screens/TravelPlanScreen';
import { TransitOptionsScreen } from '../screens/TransitOptionsScreen';
import { TicketScreen } from '../screens/TicketScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Map':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Plans':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Transit':
              iconName = focused ? 'train' : 'train-outline';
              break;
            case 'Tickets':
              iconName = focused ? 'ticket' : 'ticket-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          title: '地图',
          headerTitle: 'NJ Go - 地图'
        }} 
      />
      <Tab.Screen 
        name="Plans" 
        component={TravelPlanScreen} 
        options={{ 
          title: '出行计划',
          headerTitle: 'NJ Go - 出行计划'
        }} 
      />
      <Tab.Screen 
        name="Transit" 
        component={TransitOptionsScreen} 
        options={{ 
          title: '交通选项',
          headerTitle: 'NJ Go - 交通选项'
        }} 
      />
      <Tab.Screen 
        name="Tickets" 
        component={TicketScreen} 
        options={{ 
          title: '车票',
          headerTitle: 'NJ Go - 我的车票'
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: '个人中心',
          headerTitle: 'NJ Go - 个人中心'
        }} 
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}