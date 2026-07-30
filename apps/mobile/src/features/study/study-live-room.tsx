import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Ably from 'ably';
import { AblyProvider, ChannelProvider, useChannel, usePresence, usePresenceListener } from 'ably/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthSession } from '@/lib/auth-client';
import {
  endStudyActivity, fetchStudyCatalog, fetchStudyRoom, fetchStudyToken, sendStudyMessage,
  startStudyActivity, studyCatalogQueryKey, studyRoomQueryKey, submitStudyAnswer, updateStudyRoom,
} from './study-api';
import type { StartActivityInput, StudyActivity, StudyCatalog, StudyMessage, StudyRoomDetail } from './study-api';

const errorText = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';
export function RealtimeRoom({ roomId, onExit }: { roomId: string; onExit: () => void }) {
  const client = useMemo(() => new Ably.Realtime({ autoConnect: true, authCallback: (_params, callback) => { fetchStudyToken(roomId).then((token) => callback(null, token)).catch((error) => callback(errorText(error), null)); } }), [roomId]);
  useEffect(() => () => client.close(), [client]);
  return <AblyProvider client={client}><ChannelProvider channelName={`study:${roomId}`}><LiveRoom roomId={roomId} onExit={onExit} /></ChannelProvider></AblyProvider>;
}

function appendUnique(messages: StudyMessage[], incoming: StudyMessage) {
  return messages.some((item) => item.id === incoming.id) ? messages : [...messages, incoming];
}

function LiveRoom({ roomId, onExit }: { roomId: string; onExit: () => void }) {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const room = useQuery({ queryKey: studyRoomQueryKey(roomId), queryFn: () => fetchStudyRoom(roomId), refetchInterval: 30_000 });
  const catalog = useQuery({ queryKey: studyCatalogQueryKey, queryFn: fetchStudyCatalog, staleTime: 5 * 60_000 });
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<number | string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pickerType, setPickerType] = useState<StudyActivity['activityType'] | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const channelName = `study:${roomId}`;
  usePresence(channelName, { name: session.data?.user.name ?? 'Learner', status: 'studying' });
  const { presenceData } = usePresenceListener<{ name: string }>(channelName);
  useChannel(channelName, (event) => {
    if (event.name === 'chat-message') {
      const incoming = event.data as StudyMessage;
      queryClient.setQueryData<StudyRoomDetail>(studyRoomQueryKey(roomId), (current) => current ? { ...current, messages: appendUnique(current.messages, incoming) } : current);
      if (!chatOpen && incoming.userId !== session.data?.user.id) setUnreadMessages((count) => Math.min(99, count + 1));
      return;
    }
    if (['activity-updated', 'answer-submitted', 'room-member'].includes(event.name ?? '')) queryClient.invalidateQueries({ queryKey: studyRoomQueryKey(roomId) });
    if (event.name === 'room-closed') { Alert.alert('Room closed', 'The host ended this study room.'); onExit(); }
  });
  useEffect(() => { setAnswer(null); setFeedback(null); }, [room.data?.activity?.id]);

  const send = useMutation({
    mutationFn: (text: string) => sendStudyMessage(roomId, text),
    onMutate: async (text) => {
      const tempId = `pending-${Date.now()}-${Math.random()}`;
      const optimistic: StudyMessage = { id: tempId, userId: session.data?.user.id ?? 'me', name: session.data?.user.name ?? 'You', image: session.data?.user.image ?? null, message: text, createdAt: new Date().toISOString(), pending: true };
      queryClient.setQueryData<StudyRoomDetail>(studyRoomQueryKey(roomId), (current) => current ? { ...current, messages: [...current.messages, optimistic] } : current);
      setMessage('');
      return { tempId, text };
    },
    onSuccess: ({ message: saved }, _text, context) => queryClient.setQueryData<StudyRoomDetail>(studyRoomQueryKey(roomId), (current) => current ? { ...current, messages: appendUnique(current.messages.filter((item) => item.id !== context?.tempId), saved) } : current),
    onError: (error, _text, context) => {
      queryClient.setQueryData<StudyRoomDetail>(studyRoomQueryKey(roomId), (current) => current ? { ...current, messages: current.messages.map((item) => item.id === context?.tempId ? { ...item, pending: false, failed: true } : item) } : current);
      if (context?.text) setMessage(context.text);
      Alert.alert('Message not sent', errorText(error));
    },
  });
  const start = useMutation({
    mutationFn: (input: StartActivityInput) => startStudyActivity(roomId, input),
    onSuccess: () => { setPickerType(null); queryClient.invalidateQueries({ queryKey: studyRoomQueryKey(roomId) }); },
    onError: (error) => Alert.alert('Could not start', errorText(error)),
  });
  const submit = useMutation({ mutationFn: () => submitStudyAnswer(roomId, room.data!.activity!.id, answer!), onSuccess: (result) => { setFeedback(`${result.isCorrect ? 'Correct! ' : 'Keep learning. '}${result.explanation}`); queryClient.invalidateQueries({ queryKey: studyRoomQueryKey(roomId) }); }, onError: (error) => Alert.alert('Could not submit', errorText(error)) });
  const exit = () => {
    if (!room.data) return onExit();
    const action = room.data.membership.role === 'host' ? 'close' : 'leave';
    Alert.alert(action === 'close' ? 'Close room?' : 'Leave room?', action === 'close' ? 'This ends the room for everyone.' : 'You can join another room anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: action === 'close' ? 'Close' : 'Leave', style: 'destructive', onPress: () => updateStudyRoom(roomId, action).then(onExit).catch((error) => Alert.alert('Could not exit', errorText(error))) }]);
  };

  if (room.isPending) return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]"><ActivityIndicator size="large" color="#6d4aff" /></SafeAreaView>;
  if (room.error || !room.data) return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6"><Text className="text-center font-bold text-[#d45151]">{errorText(room.error)}</Text><Pressable className="mt-4 rounded-2xl bg-[#10233f] px-6 py-3" onPress={onExit}><Text className="font-bold text-white">Back to rooms</Text></Pressable></SafeAreaView>;
  const data = room.data; const activity = data.activity; const isHost = data.membership.role === 'host';
  return <SafeAreaView className="flex-1 bg-[#edf6ff]">
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View className="flex-row items-center pt-3"><Pressable className="h-11 w-11 items-center justify-center rounded-2xl bg-white" onPress={exit}><Ionicons name="arrow-back" size={22} color="#10233f" /></Pressable><View className="ml-4 flex-1"><Text className="text-xl font-extrabold text-[#10233f]">{data.room.title}</Text><Text className="mt-0.5 text-xs font-bold text-[#18a67e]">● {presenceData.length} live · code {data.room.code}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">{data.members.map((member) => <View key={member.userId} className="mr-2 flex-row items-center rounded-full bg-white py-2 pl-2 pr-4"><View className="h-8 w-8 items-center justify-center rounded-full bg-[#e8f1ff]"><Text className="font-extrabold text-[#146ef5]">{member.name.charAt(0).toUpperCase()}</Text></View><Text className="ml-2 font-bold text-[#40546d]">{member.name}{member.role === 'host' ? ' ★' : ''}</Text></View>)}</ScrollView>
      {isHost ? <HostActivityPicker catalog={catalog.data} loadingCatalog={catalog.isPending} selectedType={pickerType} setSelectedType={setPickerType} starting={start.isPending} onStart={(input) => start.mutate(input)} /> : null}
      {activity ? <ActivityCard activity={activity} answer={answer} setAnswer={setAnswer} feedback={feedback} submitting={submit.isPending} onSubmit={() => submit.mutate()} onEnd={isHost ? () => endStudyActivity(roomId, activity.id).then(() => queryClient.invalidateQueries({ queryKey: studyRoomQueryKey(roomId) })).catch((error) => Alert.alert('Could not end', errorText(error))) : undefined} /> : <View className="mt-5 items-center rounded-[25px] bg-white p-7"><Ionicons name="hourglass-outline" size={32} color="#7890aa" /><Text className="mt-3 font-extrabold text-[#40546d]">{isHost ? 'Choose a lesson to begin' : 'Waiting for the host to start'}</Text></View>}
    </ScrollView>
    <FloatingChatButton unread={unreadMessages} onPress={() => { setUnreadMessages(0); setChatOpen(true); }} />
    <ChatPanel
      visible={chatOpen}
      onClose={() => setChatOpen(false)}
      messages={data.messages}
      members={data.members}
      currentUserId={session.data?.user.id}
      onlineCount={presenceData.length}
      message={message}
      setMessage={setMessage}
      sending={send.isPending}
      onSend={() => send.mutate(message.trim())}
    />
  </SafeAreaView>;
}

function FloatingChatButton({ unread, onPress }: { unread: number; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!unread) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.13, damping: 7, stiffness: 260, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 240, useNativeDriver: true }),
    ]).start();
  }, [scale, unread]);
  return (
    <Animated.View style={{ position: 'absolute', right: 20, bottom: Math.max(insets.bottom + 16, 24), width: 64, height: 64, zIndex: 50, backgroundColor: 'transparent', transform: [{ scale }], shadowColor: '#173f73', shadowOpacity: 0.3, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open group chat" className="h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-[#146ef5] active:opacity-85" onPress={onPress}>
        <Ionicons name="chatbubble-ellipses" size={29} color="white" />
      </Pressable>
      {unread > 0 ? <View className="absolute -right-1 -top-1 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#ef4f5f] px-1.5 py-1"><Text className="text-[11px] font-extrabold text-white">{unread > 9 ? '9+' : unread}</Text></View> : null}
    </Animated.View>
  );
}

function MemberAvatarStack({ members }: { members: StudyRoomDetail['members'] }) {
  const visibleMembers = members.slice(0, 3);
  return (
    <View className="h-11 flex-row items-center pr-2">
      {visibleMembers.map((member, index) => member.image ? (
        <Image key={member.userId} source={{ uri: member.image }} contentFit="cover" style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'white', marginLeft: index ? -12 : 0 }} />
      ) : (
        <View key={member.userId} className={`h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#e9f1ff] ${index ? '-ml-3' : ''}`}><Text className="font-extrabold text-[#146ef5]">{member.name.charAt(0).toUpperCase()}</Text></View>
      ))}
    </View>
  );
}
function ChatPanel({ visible, onClose, messages, members, currentUserId, onlineCount, message, setMessage, sending, onSend }: { visible: boolean; onClose: () => void; messages: StudyMessage[]; members: StudyRoomDetail['members']; currentUserId?: string; onlineCount: number; message: string; setMessage: (value: string) => void; sending: boolean; onSend: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const composerBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 12);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) { setAndroidKeyboardHeight(0); return; }
    const show = Keyboard.addListener('keyboardDidShow', (event) => setAndroidKeyboardHeight(Math.max(0, event.endCoordinates.height - insets.bottom)));
    const hide = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, [insets.bottom, visible]);
  const panelHeight = Math.min(windowHeight * 0.72, Math.max(280, windowHeight - androidKeyboardHeight - 80));
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <Pressable className="flex-1 bg-black/35" onPress={onClose} />
        <SafeAreaView className="overflow-hidden rounded-t-[32px] bg-[#edf3fa]" edges={['left', 'right']} style={{ height: panelHeight, marginBottom: Platform.OS === 'android' ? androidKeyboardHeight : 0 }}>
          <View className="flex-row items-center border-b border-[#dbe6f1] bg-white px-5 py-4">
            <MemberAvatarStack members={members} />
            <View className="ml-3 flex-1"><Text className="text-lg font-extrabold text-[#10233f]">Group chat</Text><Text className="mt-0.5 text-xs font-bold text-[#18a67e]">● {onlineCount} online · realtime</Text></View>
            <Pressable accessibilityLabel="Close chat" className="h-10 w-10 items-center justify-center rounded-full bg-[#eff3f7]" onPress={onClose}><Ionicons name="close" size={22} color="#40546d" /></Pressable>
          </View>
          <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="px-4 pb-4 pt-5" keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.length ? messages.map((item) => <ChatBubble key={item.id} item={item} own={item.userId === currentUserId || item.id.startsWith('pending-')} />) : <View className="items-center py-12"><View className="h-16 w-16 items-center justify-center rounded-full bg-white"><Ionicons name="chatbubbles-outline" size={30} color="#8ca1b7" /></View><Text className="mt-4 text-lg font-extrabold text-[#40546d]">Start the conversation</Text><Text className="mt-2 text-center leading-5 text-[#718198]">Say hello or discuss the current lesson with everyone.</Text></View>}
          </ScrollView>
          <View className="flex-row items-end border-t border-[#dbe6f1] bg-white px-4 pt-3" style={{ paddingBottom: composerBottomPadding }}>
            <View className="mr-3 min-h-12 min-w-0 flex-1 flex-row items-end rounded-[22px] border border-[#dce5ee] bg-[#f0f4f8] pl-4 pr-2">
              <TextInput
                className="max-h-28 min-h-12 min-w-0 flex-1 py-3 pr-2 text-base leading-5 text-[#10233f]"
                placeholder="Message your study group…"
                placeholderTextColor="#8b9bad"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
                textAlignVertical="center"
                selectionColor="#146ef5"
                autoCorrect
                onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
              />
              {message.length ? <Pressable accessibilityLabel="Clear message" className="mb-2.5 h-7 w-7 items-center justify-center rounded-full" onPress={() => setMessage('')}><Ionicons name="close-circle" size={21} color="#8796a8" /></Pressable> : null}
            </View>
            <Pressable accessibilityLabel="Send message" disabled={!message.trim() || sending} className="h-12 w-12 items-center justify-center rounded-full bg-[#146ef5] disabled:opacity-40" onPress={onSend}>{sending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={21} color="white" />}</Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function HostActivityPicker({ catalog, loadingCatalog, selectedType, setSelectedType, starting, onStart }: { catalog?: StudyCatalog; loadingCatalog: boolean; selectedType: StudyActivity['activityType'] | null; setSelectedType: (type: StudyActivity['activityType'] | null) => void; starting: boolean; onStart: (input: StartActivityInput) => void }) {
  const types = [{ id: 'grammar' as const, label: 'Grammar', icon: 'create-outline' as const }, { id: 'vocabulary' as const, label: 'Vocabulary', icon: 'library-outline' as const }, { id: 'discussion' as const, label: 'Discussion', icon: 'chatbubbles-outline' as const }];
  return <View className="mt-5 rounded-[26px] bg-[#10233f] p-5">
    <Text className="font-extrabold text-white">Choose what everyone learns</Text><Text className="mt-1 text-xs leading-5 text-[#aebed1]">Select a real Neon lesson. Groq creates a fresh group question from it.</Text>
    <View className="mt-4 flex-row gap-2">{types.map((type) => <Pressable key={type.id} disabled={starting} className={`flex-1 items-center rounded-2xl px-2 py-3 ${selectedType === type.id ? 'bg-[#146ef5]' : 'bg-white/10'}`} onPress={() => setSelectedType(selectedType === type.id ? null : type.id)}><Ionicons name={type.icon} size={20} color="white" /><Text className="mt-1 text-xs font-bold text-white">{type.label}</Text></Pressable>)}</View>
    {selectedType ? <View className="mt-4 max-h-80 overflow-hidden rounded-2xl bg-white/10 p-2">{loadingCatalog ? <ActivityIndicator className="py-6" color="white" /> : <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {selectedType === 'grammar' ? catalog?.grammar.map((item) => <LessonChoice key={item.id} title={item.title} detail={`${item.category} · ${item.level} · ${item.estimatedMinutes} min`} description={item.summary} disabled={starting} onPress={() => onStart({ activityType: 'grammar', sourceId: item.id })} />) : null}
      {selectedType === 'vocabulary' ? catalog?.vocabulary.map((item) => <LessonChoice key={`${item.category}-${item.level}`} title={item.category} detail={`${item.level} · ${item.count} words`} disabled={starting} onPress={() => onStart({ activityType: 'vocabulary', category: item.category, level: item.level })} />) : null}
      {selectedType === 'discussion' ? catalog?.discussions.map((item) => <LessonChoice key={item.id} title={item.title} detail={`${item.category} · ${item.level}`} description={item.description ?? undefined} disabled={starting} onPress={() => onStart({ activityType: 'discussion', sourceId: item.id })} />) : null}
    </ScrollView>}</View> : null}
    {starting ? <View className="mt-4 flex-row items-center justify-center"><ActivityIndicator size="small" color="#8dc5ff" /><Text className="ml-2 text-xs font-bold text-[#bcdcff]">AI teacher is preparing the lesson…</Text></View> : null}
  </View>;
}

function LessonChoice({ title, detail, description, disabled, onPress }: { title: string; detail: string; description?: string; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} className="mb-2 rounded-2xl bg-white p-4 active:opacity-75" onPress={onPress}><View className="flex-row items-center"><View className="min-w-0 flex-1"><Text className="font-extrabold text-[#10233f]">{title}</Text><Text className="mt-1 text-xs font-bold text-[#6d4aff]">{detail}</Text>{description ? <Text className="mt-2 text-xs leading-5 text-[#718198]" numberOfLines={2}>{description}</Text> : null}</View><Ionicons name="play-circle" size={28} color="#146ef5" /></View></Pressable>;
}

function ChatBubble({ item, own }: { item: StudyMessage; own: boolean }) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(entrance, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [entrance]);
  const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }} className={`mb-4 flex-row ${own ? 'justify-end' : 'justify-start'}`}>
    {!own ? item.image ? <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'white', marginRight: 8, marginTop: 20 }} /> : <View className="mr-2 mt-5 h-9 w-9 items-center justify-center rounded-full bg-white"><Text className="font-extrabold text-[#6d4aff]">{item.name.charAt(0).toUpperCase()}</Text></View> : null}
    <View className="max-w-[78%]">
      <Text className={`mb-1 text-[11px] font-extrabold ${own ? 'text-right text-[#60738a]' : 'text-[#60738a]'}`}>{own ? 'You' : item.name}</Text>
      <View className={`px-4 py-3 ${own ? 'rounded-[20px] rounded-br-md bg-[#146ef5]' : 'rounded-[20px] rounded-bl-md bg-white'}`}><Text className={`leading-5 ${own ? 'text-white' : 'text-[#10233f]'}`}>{item.message}</Text></View>
      <View className={`mt-1 flex-row items-center ${own ? 'justify-end' : 'justify-start'}`}><Text className={`text-[10px] ${item.failed ? 'font-bold text-[#d45151]' : 'text-[#8796a8]'}`}>{item.failed ? 'Not sent' : item.pending ? 'Sending…' : time}</Text>{own && !item.pending && !item.failed ? <Ionicons name="checkmark-done" size={12} color="#6c8cad" style={{ marginLeft: 3 }} /> : null}</View>
    </View>
  </Animated.View>;
}

function ActivityCard({ activity, answer, setAnswer, feedback, submitting, onSubmit, onEnd }: { activity: StudyActivity; answer: number | string | null; setAnswer: (answer: number | string) => void; feedback: string | null; submitting: boolean; onSubmit: () => void; onEnd?: () => void }) {
  const question = activity.content.question; const isDiscussion = activity.activityType === 'discussion';
  return <View className="mt-5 rounded-[28px] bg-white p-5">
    <View className="flex-row items-center"><View className="rounded-full bg-[#eeeaff] px-3 py-2"><Text className="text-xs font-extrabold uppercase text-[#6d4aff]">{activity.activityType}</Text></View>{activity.content.aiGenerated ? <View className="ml-2 flex-row items-center rounded-full bg-[#e9f6ff] px-3 py-2"><Ionicons name="sparkles" size={12} color="#146ef5" /><Text className="ml-1 text-[10px] font-extrabold text-[#146ef5]">FRESH AI PRACTICE</Text></View> : null}<Text className="ml-auto text-xs font-bold text-[#718198]">{activity.answerCount} answered</Text></View>
    <Text className="mt-4 text-xl font-extrabold text-[#10233f]">{activity.title}</Text>{activity.content.level ? <Text className="mt-1 text-xs font-bold uppercase text-[#6d4aff]">{activity.content.category} · {activity.content.level}</Text> : null}
    {activity.content.summary ? <Text className="mt-3 leading-6 text-[#52647b]">{activity.content.summary}</Text> : null}
    {activity.content.explanation ? <View className="mt-4 rounded-2xl bg-[#f3f7fb] p-4"><Text className="text-xs font-extrabold uppercase text-[#52647b]">Lesson explanation</Text><Text className="mt-2 leading-6 text-[#40546d]">{activity.content.explanation}</Text></View> : null}
    {activity.content.structures?.length ? <View className="mt-4"><Text className="font-extrabold text-[#10233f]">Structure</Text><View className="mt-2 flex-row flex-wrap gap-2">{activity.content.structures.map((item) => <View key={item} className="rounded-xl bg-[#eeeaff] px-3 py-2"><Text className="font-bold text-[#5d3de5]">{item}</Text></View>)}</View></View> : null}
    {activity.content.rules?.length ? <View className="mt-4"><Text className="font-extrabold text-[#10233f]">Key rules</Text>{activity.content.rules.map((rule) => <View key={rule.title} className="mt-2 rounded-2xl border border-[#e5edf5] p-4"><Text className="font-bold text-[#10233f]">{rule.title}</Text><Text className="mt-1 leading-5 text-[#60738a]">{rule.description}</Text></View>)}</View> : null}
    {activity.content.tips?.length ? <View className="mt-4 rounded-2xl bg-[#fff7df] p-4"><Text className="font-extrabold text-[#9c6b08]">Tips</Text>{activity.content.tips.map((tip) => <Text key={tip} className="mt-2 leading-5 text-[#795b20]">• {tip}</Text>)}</View> : null}
    {activity.content.exceptions?.length ? <View className="mt-3 rounded-2xl bg-[#fff0ee] p-4"><Text className="font-extrabold text-[#b25249]">Exceptions</Text>{activity.content.exceptions.map((item) => <Text key={item} className="mt-2 leading-5 text-[#834943]">• {item}</Text>)}</View> : null}
    {activity.content.words?.length ? <View className="mt-4"><Text className="font-extrabold text-[#10233f]">Words in this pack</Text>{activity.content.words.map((word) => <View key={word.id} className="mt-2 rounded-2xl bg-[#f3f7fb] p-4"><View className="flex-row items-start"><View className="flex-1"><Text className="text-lg font-extrabold text-[#10233f]">{word.word}</Text><Text className="mt-1 text-xs font-bold text-[#6d4aff]">{word.partOfSpeech ?? 'word'}{word.pronunciation ? ` · ${word.pronunciation}` : ''}</Text></View><Text className="text-sm font-bold text-[#17805f]">{word.hindiMeaning}</Text></View><Text className="mt-2 leading-5 text-[#52647b]">{word.meaning}</Text>{word.example ? <Text className="mt-2 text-sm italic leading-5 text-[#718198]">“{word.example}”</Text> : null}{word.synonyms?.length ? <Text className="mt-2 text-xs text-[#718198]">Similar: {word.synonyms.slice(0, 4).join(', ')}</Text> : null}</View>)}</View> : null}
    {activity.content.prompt ? <Text className="mt-4 rounded-2xl bg-[#f2f6fb] p-4 leading-6 text-[#40546d]">{activity.content.prompt}</Text> : null}
    {activity.content.examples?.length ? <View className="mt-4"><Text className="font-extrabold text-[#10233f]">Practical examples</Text>{activity.content.examples.map((example) => <Text key={example} className="mt-2 rounded-xl bg-[#eff8f5] p-3 font-semibold leading-5 text-[#27715d]">“{example}”</Text>)}</View> : null}
    {question ? <><Text className="mt-5 text-base font-extrabold text-[#10233f]">{question.question}</Text>{question.options.map((option, index) => <Pressable key={`${option}-${index}`} disabled={Boolean(activity.myAnswer)} className={`mt-2 rounded-2xl border p-4 ${answer === index ? 'border-[#146ef5] bg-[#eaf3ff]' : 'border-[#e3ebf4] bg-white'}`} onPress={() => setAnswer(index)}><Text className="font-semibold text-[#40546d]">{String.fromCharCode(65 + index)}. {option}</Text></Pressable>)}</> : null}
    {isDiscussion ? <TextInput editable={!activity.myAnswer} className="mt-4 min-h-28 rounded-2xl bg-[#f2f6fb] p-4 text-[#10233f]" placeholder="Write your response for the group…" multiline maxLength={1000} value={typeof answer === 'string' ? answer : ''} onChangeText={setAnswer} /> : null}
    {feedback ? <Text className="mt-4 rounded-2xl bg-[#eff8f5] p-4 font-semibold leading-5 text-[#27715d]">{feedback}</Text> : activity.myAnswer ? <Text className="mt-4 font-bold text-[#18a67e]">Submitted · {activity.myAnswer.score}% · Added to your Progress</Text> : null}
    {!activity.myAnswer ? <Pressable disabled={answer === null || answer === '' || submitting} className="mt-4 items-center rounded-2xl bg-[#146ef5] py-4 disabled:opacity-40" onPress={onSubmit}>{submitting ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">Submit and save progress</Text>}</Pressable> : null}
    {onEnd ? <Pressable className="mt-3 items-center py-2" onPress={onEnd}><Text className="font-bold text-[#d45151]">End this activity</Text></Pressable> : null}
  </View>;
}