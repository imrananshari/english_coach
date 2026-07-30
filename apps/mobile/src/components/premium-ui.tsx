import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export const glassShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#50658f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  android: { elevation: 5 },
  default: {
    boxShadow: '0 12px 34px rgba(57, 76, 112, 0.14)',
  } as ViewStyle,
})!;

export const heroShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#304d84',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },
  android: { elevation: 9 },
  default: {
    boxShadow: '0 18px 42px rgba(35, 61, 112, 0.24)',
  } as ViewStyle,
})!;

export function FadeInView({
  children,
  className,
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        speed: 18,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      className={className}
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}

export function PremiumPressable({
  children,
  className,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & { children: ReactNode; className?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 28,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[style as StyleProp<ViewStyle>, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        className={className}
        disabled={disabled}
        onPressIn={(event) => {
          animate(0.97);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
