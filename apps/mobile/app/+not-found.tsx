import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundRoute() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-slate-50 px-6">
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <Text className="text-xl font-semibold text-slate-900">
        This screen does not exist.
      </Text>
      <Link href="/" className="text-blue-600">
        Return home
      </Link>
    </View>
  );
}
