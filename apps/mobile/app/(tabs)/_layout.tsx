import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Children, useRef, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthSession } from '@/lib/auth-client';

const iconNames = { index: 'home', learn: 'book', speak: 'mic', progress: 'stats-chart', profile: 'person' } as const;

function GlassBackground() {
  return (
    <View pointerEvents="none" style={styles.glassShell}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={70} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />
      )}
      <View style={styles.glassTint} />
    </View>
  );
}

type PressableProps = ComponentProps<typeof Pressable>;
type AnimatedTabButtonProps = Pick<PressableProps, 'accessibilityLabel' | 'accessibilityRole' | 'accessibilityState' | 'onLongPress' | 'onPress' | 'testID'> & { children?: ReactNode };

function AnimatedTabButton(props: AnimatedTabButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (value: number) => Animated.spring(scale, { toValue: value, damping: 15, stiffness: 260, useNativeDriver: true }).start();
  return (
    <Pressable
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      onLongPress={props.onLongPress}
      onPress={props.onPress}
      onPressIn={() => animateTo(0.88)}
      onPressOut={() => animateTo(1)}
      testID={props.testID}
      style={styles.tabPressable}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>{Children.map(props.children, (child) => typeof child === 'string' || typeof child === 'number' ? <Text>{child}</Text> : child)}</Animated.View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { data: session, isPending } = useAuthSession();
  const insets = useSafeAreaInsets();
  const sideMargin = Platform.OS === 'android' ? 24 : 18;
  const bottomMargin = insets.bottom + 8;

  if (isPending) return <View className="flex-1 items-center justify-center bg-[#eaf4ff]"><ActivityIndicator color="#146ef5" /></View>;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#146ef5',
        tabBarInactiveTintColor: '#8796aa',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: Platform.OS === 'android' ? 10 : 10.5, fontWeight: '700', marginTop: 1 },
        tabBarItemStyle: { minWidth: 0 },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
        tabBarBackground: () => <GlassBackground />,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomMargin,
          left: sideMargin,
          right: sideMargin,
          height: 70,
          paddingHorizontal: Platform.OS === 'android' ? 3 : 5,
          paddingTop: 7,
          paddingBottom: 7,
          borderTopWidth: 0,
          borderRadius: 27,
          backgroundColor: 'transparent',
          shadowColor: '#315b8f',
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 7 },
          elevation: 12,
        },
        tabBarIcon: ({ color, size }) => <Ionicons name={iconNames[route.name as keyof typeof iconNames]} color={color} size={size - (Platform.OS === 'android' ? 2 : 1)} />,
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

const styles = StyleSheet.create({
  glassShell: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(247,251,255,0.75)',
  },
  glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.18)' },
  androidGlass: { backgroundColor: 'rgba(247,251,255,0.96)' },
  tabPressable: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
  tabContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
