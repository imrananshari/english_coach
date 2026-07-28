import { Text, View } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-2xl font-semibold text-slate-900">{title}</Text>
      <Text className="mt-2 text-center text-slate-500">
        This area will be added in a later development phase.
      </Text>
    </View>
  );
}
