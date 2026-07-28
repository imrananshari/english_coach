import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthSession } from '@/lib/auth-client';

export default function IndexRoute() {
  const { data: session, isPending } = useAuthSession();
  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator color="#146ef5" size="large" />
      </View>
    );
  }
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
