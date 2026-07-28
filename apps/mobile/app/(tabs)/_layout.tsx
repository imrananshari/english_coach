import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';

import { useAuthSession } from '@/lib/auth-client';

const iconNames = {
  index: 'home',
  learn: 'book',
  speak: 'mic',
  progress: 'stats-chart',
  profile: 'person',
} as const;

export default function TabsLayout() {
  const { data: session, isPending } = useAuthSession();
  if (isPending)
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator color="#146ef5" />
      </View>
    );
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#146ef5',
        tabBarInactiveTintColor: '#8796aa',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 14,
          left: 16,
          right: 16,
          height: 72,
          paddingTop: 9,
          paddingBottom: 9,
          borderRadius: 26,
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.95)',
          shadowColor: '#4779b8',
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 7 },
          elevation: 10,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={iconNames[route.name as keyof typeof iconNames]}
            color={color}
            size={size - 1}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn' }} />
      <Tabs.Screen name="speak" options={{ title: 'Speak' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
