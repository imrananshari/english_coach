import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient, useAuthSession } from '@/lib/auth-client';

export function ProfileScreen() {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const signOut = async () => {
    await authClient.signOut();
    router.replace('/(auth)/login');
  };
  return (
    <SafeAreaView className="flex-1 bg-[#edf6ff] px-5 pt-5">
      <Text className="text-[28px] font-extrabold text-[#10233f]">Profile</Text>
      <View className="mt-6 items-center rounded-[30px] border border-white bg-white/80 p-6 shadow-md shadow-blue-100">
        <View className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-[#dcecff]">
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              contentFit="cover"
              style={{ width: 112, height: 112 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="person" size={45} color="#146ef5" />
            </View>
          )}
        </View>
        <Text className="mt-4 text-xl font-bold text-[#10233f]">
          {user?.name}
        </Text>
        <Text className="mt-1 text-[#708198]">{user?.email}</Text>
        <View className="mt-5 flex-row items-center rounded-2xl bg-[#e7f2ff] px-4 py-3">
          <Ionicons name="shield-checkmark" size={19} color="#146ef5" />
          <Text className="ml-2 font-semibold text-[#31577f]">
            Email verified
          </Text>
        </View>
      </View>
      <Pressable
        className="mt-5 flex-row items-center justify-center rounded-2xl border border-red-200 bg-white/80 py-4"
        onPress={signOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#dc4c4c" />
        <Text className="ml-2 font-bold text-red-600">Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
