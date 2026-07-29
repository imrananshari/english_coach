import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { lazy, Suspense, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createStudyRoom, fetchStudyRooms, joinStudyRoom, studyRoomsQueryKey } from './study-api';

const RealtimeRoom = lazy(async () => {
  const module = await import('./study-live-room');
  return { default: module.RealtimeRoom };
});
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';

export function StudyScreen() {
  const [roomId, setRoomId] = useState<string | null>(null);
  return roomId ? (
    <Suspense fallback={<SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]"><ActivityIndicator size="large" color="#6d4aff" /><Text className="mt-3 font-bold text-[#52647b]">Opening live room…</Text></SafeAreaView>}>
      <RealtimeRoom roomId={roomId} onExit={() => setRoomId(null)} />
    </Suspense>
  ) : <StudyLobby onOpen={setRoomId} />;
}
function StudyLobby({ onOpen }: { onOpen: (roomId: string) => void }) {
  const queryClient = useQueryClient();
  const rooms = useQuery({ queryKey: studyRoomsQueryKey, queryFn: fetchStudyRooms });
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const create = useMutation({ mutationFn: createStudyRoom, onSuccess: ({ room }) => { queryClient.invalidateQueries({ queryKey: studyRoomsQueryKey }); onOpen(room.id); }, onError: (error) => Alert.alert('Could not create room', errorText(error)) });
  const join = useMutation({ mutationFn: joinStudyRoom, onSuccess: ({ room }) => { queryClient.invalidateQueries({ queryKey: studyRoomsQueryKey }); onOpen(room.id); }, onError: (error) => Alert.alert('Could not join room', errorText(error)) });

  return <SafeAreaView className="flex-1 bg-[#edf6ff]">
    <ScrollView contentContainerClassName="px-5 pb-12" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center pt-3">
        <Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-white" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color="#10233f" /></Pressable>
        <View className="ml-4 flex-1"><Text className="text-2xl font-extrabold text-[#10233f]">Learn Together</Text><Text className="text-sm text-[#718198]">Live study rooms with real learners</Text></View>
      </View>
      <View className="mt-6 overflow-hidden rounded-[30px] bg-[#6d4aff] p-6">
        <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15" /><Ionicons name="people" size={31} color="white" />
        <Text className="mt-4 text-2xl font-extrabold text-white">Study, answer and grow together</Text>
        <Text className="mt-2 leading-6 text-[#e3dcff]">Practice real lessons, answer fresh AI questions and save your own progress.</Text>
        <Pressable className="mt-5 self-start rounded-2xl bg-white px-5 py-3" onPress={() => setShowCreate((value) => !value)}><Text className="font-extrabold text-[#5d3de5]">{showCreate ? 'Cancel' : 'Create a room'}</Text></Pressable>
      </View>
      {showCreate ? <View className="mt-4 rounded-[26px] bg-white p-5">
        <Text className="font-extrabold text-[#10233f]">Room name</Text>
        <TextInput className="mt-3 rounded-2xl bg-[#f1f6fc] px-4 py-4 text-[#10233f]" placeholder="Example: Evening grammar club" value={title} onChangeText={setTitle} maxLength={60} />
        <Pressable disabled={title.trim().length < 3 || create.isPending} className="mt-4 items-center rounded-2xl bg-[#146ef5] py-4 disabled:opacity-40" onPress={() => create.mutate({ title: title.trim(), visibility: 'public' })}>{create.isPending ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Create and enter</Text>}</Pressable>
      </View> : null}
      <View className="mt-5 flex-row items-center rounded-[24px] bg-white p-3">
        <TextInput className="min-w-0 flex-1 px-3 py-2 font-bold uppercase tracking-widest text-[#10233f]" placeholder="PRIVATE ROOM CODE" autoCapitalize="characters" value={code} onChangeText={setCode} maxLength={10} />
        <Pressable disabled={code.trim().length < 4 || join.isPending} className="rounded-2xl bg-[#10233f] px-5 py-3 disabled:opacity-40" onPress={() => join.mutate({ code: code.trim().toUpperCase() })}><Text className="font-extrabold text-white">Join</Text></Pressable>
      </View>
      <View className="mb-3 mt-7 flex-row items-center justify-between"><Text className="text-xl font-extrabold text-[#10233f]">Public rooms</Text><Pressable onPress={() => rooms.refetch()}><Ionicons name="refresh" size={20} color="#146ef5" /></Pressable></View>
      {rooms.isPending ? <ActivityIndicator className="mt-8" color="#146ef5" /> : rooms.error ? <Text className="rounded-2xl bg-white p-5 text-[#d45151]">{errorText(rooms.error)}</Text> : rooms.data?.rooms.length ? rooms.data.rooms.map((room) =>
        <Pressable key={room.id} className="mb-3 rounded-[25px] bg-white p-5 active:opacity-80" onPress={() => room.isMember ? onOpen(room.id) : join.mutate({ roomId: room.id })}>
          <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#eeeaff]"><Ionicons name="people-outline" size={24} color="#6d4aff" /></View><View className="ml-4 flex-1"><Text className="text-lg font-extrabold text-[#10233f]">{room.title}</Text><Text className="mt-1 text-sm text-[#718198]">{room.host?.name ?? 'Host'} · {room.memberCount}/{room.maxMembers} learners</Text></View><Ionicons name="chevron-forward" size={20} color="#96a4b6" /></View>
        </Pressable>) : <View className="items-center rounded-[25px] bg-white p-8"><Ionicons name="chatbubbles-outline" size={36} color="#9aacc1" /><Text className="mt-3 font-bold text-[#52647b]">No public rooms yet. Start the first one!</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}

