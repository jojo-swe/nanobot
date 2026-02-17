import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useConnection } from '../context/ConnectionContext';
import ConnectScreen from '../screens/ConnectScreen';
import ChatScreen from '../screens/ChatScreen';
import StatusScreen from '../screens/StatusScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { ActivityIndicator, View } from 'react-native';

const Tab = createBottomTabNavigator();

const tabIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Chat: 'chatbubble-ellipses-outline',
  Status: 'pulse-outline',
  Settings: 'settings-outline',
};

export default function AppNavigator() {
  const { isConfigured, loading } = useConnection();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.pocket[400]} size="large" />
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <NavigationContainer>
        <ConnectScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.pocket[400],
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, size }) => {
            const iconName = tabIcons[route.name] || 'ellipse-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerTitle: '🤖 pocketbot' }}
        />
        <Tab.Screen
          name="Status"
          component={StatusScreen}
          options={{ headerTitle: 'Status' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerTitle: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
