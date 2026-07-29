import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchLearn, learnQueryKey } from './learn-api';

const moduleIcons={grammar:'create-outline',vocabulary:'library-outline',speaking:'mic-outline'} as const;
function openSkill(skill:'grammar'|'vocabulary'|'speaking'){if(skill==='grammar')router.push('/grammar');else if(skill==='vocabulary')router.push('/vocabulary');else router.push('/(tabs)/speak');}
function labelActivity(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());}

export function LearnScreen(){
  const learn=useQuery({queryKey:learnQueryKey,queryFn:fetchLearn});
  if(learn.isPending)return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff]"><ActivityIndicator size="large" color="#146ef5" /></SafeAreaView>;
  if(learn.error)return <SafeAreaView className="flex-1 items-center justify-center bg-[#edf6ff] px-6"><Ionicons name="cloud-offline-outline" size={42} color="#e35d55"/><Text className="mt-4 text-center font-semibold text-[#10233f]">{learn.error.message}</Text><Pressable className="mt-5 rounded-2xl bg-[#146ef5] px-6 py-3" onPress={()=>learn.refetch()}><Text className="font-bold text-white">Try again</Text></Pressable></SafeAreaView>;
  const data=learn.data!;const percent=Math.min(100,Math.round((data.today.learningMinutes/data.profile.dailyGoal)*100));
  return <SafeAreaView className="flex-1 bg-[#edf6ff]" edges={['top']}>
    <ScrollView contentContainerClassName="px-5 pb-32 pt-4" showsVerticalScrollIndicator={false}>
      <View><Text className="text-3xl font-extrabold text-[#10233f]">Learn</Text><Text className="mt-1 text-[#718198]">Your practical English learning path</Text></View>
      <View className="mt-5 overflow-hidden rounded-[30px] bg-[#146ef5] p-6 shadow-lg shadow-blue-200">
        <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15"/><Text className="text-xs font-extrabold uppercase tracking-wider text-blue-100">Today’s learning goal</Text>
        <View className="mt-3 flex-row items-end"><Text className="text-4xl font-extrabold text-white">{data.today.learningMinutes}</Text><Text className="mb-1 ml-2 font-bold text-blue-100">/ {data.profile.dailyGoal} min</Text></View>
        <View className="mt-5 h-3 overflow-hidden rounded-full bg-white/20"><View className="h-full rounded-full bg-white" style={{width:`${percent}%`}}/></View>
        <View className="mt-5 flex-row gap-3"><View className="rounded-full bg-white/15 px-3 py-2"><Text className="text-xs font-bold text-white">{data.profile.level.replace('-',' ')}</Text></View><View className="rounded-full bg-white/15 px-3 py-2"><Text className="text-xs font-bold text-white">🔥 {data.profile.streak} day streak</Text></View></View>
      </View>
      <Pressable className="mt-5 overflow-hidden rounded-[28px] bg-[#10233f] p-5 active:opacity-90" onPress={()=>openSkill(data.recommended.skill)}>
        <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Ionicons name="sparkles" size={24} color="#8dc5ff"/></View><View className="ml-4 flex-1"><Text className="text-xs font-bold uppercase text-[#8dc5ff]">Recommended next</Text><Text className="mt-1 text-lg font-extrabold text-white">{data.recommended.title}</Text></View><Ionicons name="arrow-forward" size={22} color="white"/></View><Text className="mt-3 leading-6 text-[#c2d2e5]">{data.recommended.subtitle}</Text>
      </Pressable>
      <Pressable className="mt-4 overflow-hidden rounded-[28px] bg-[#6d4aff] p-5 active:opacity-90" onPress={()=>router.push('/study')}>
        <View className="flex-row items-center"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Ionicons name="people" size={25} color="white"/></View><View className="ml-4 flex-1"><Text className="text-xs font-bold uppercase text-[#dcd3ff]">Live learning</Text><Text className="mt-1 text-lg font-extrabold text-white">Learn Together</Text></View><Ionicons name="arrow-forward" size={22} color="white"/></View>
        <Text className="mt-3 leading-6 text-[#e3dcff]">Join a room for group grammar, vocabulary, discussions and chat.</Text>
      </Pressable>
      <View className="mb-3 mt-7 flex-row items-center justify-between"><Text className="text-xl font-extrabold text-[#10233f]">Learning pathways</Text><Text className="text-sm font-semibold text-[#718198]">Real progress</Text></View>
      {data.modules.map((module)=>{const modulePercent=module.total?Math.min(100,Math.round(module.completed/module.total*100)):0;return <Pressable key={module.id} className="mb-3 rounded-[26px] border border-white bg-white/85 p-5 active:opacity-80" onPress={()=>openSkill(module.id)}>
        <View className="flex-row items-center"><View className="h-14 w-14 items-center justify-center rounded-2xl" style={{backgroundColor:`${module.color}18`}}><Ionicons name={moduleIcons[module.id]} size={27} color={module.color}/></View><View className="ml-4 flex-1"><Text className="text-lg font-extrabold text-[#10233f]">{module.title}</Text><Text className="mt-1 text-sm leading-5 text-[#718198]">{module.description}</Text></View><Ionicons name="chevron-forward" size={20} color="#96a4b6"/></View>
        <View className="mt-4 flex-row items-center"><View className="mr-3 h-2 flex-1 overflow-hidden rounded-full bg-[#e6edf5]"><View className="h-full rounded-full" style={{width:`${modulePercent}%`,backgroundColor:module.color}}/></View><Text className="text-xs font-extrabold text-[#52647b]">{module.completed} done</Text></View>
      </Pressable>;})}
      <Text className="mb-3 mt-5 text-xl font-extrabold text-[#10233f]">Today’s checklist</Text>
      <View className="rounded-[26px] border border-white bg-white/85 p-5">
        {[{icon:'create-outline' as const,text:'Complete one grammar lesson',done:data.today.lessonsCompleted>0},{icon:'library-outline' as const,text:'Review useful vocabulary',done:data.today.wordsLearned>0},{icon:'mic-outline' as const,text:'Practice speaking for one minute',done:data.today.speakingMinutes>0}].map((item)=><View key={item.text} className="mb-4 flex-row items-center last:mb-0"><Ionicons name={item.done?'checkmark-circle':'ellipse-outline'} size={24} color={item.done?'#18a67e':'#a7b4c4'}/><Text className={`ml-3 flex-1 font-semibold ${item.done?'text-[#789087]':'text-[#40546d]'}`}>{item.text}</Text></View>)}
      </View>
      {data.recent.length?<><Text className="mb-3 mt-6 text-xl font-extrabold text-[#10233f]">Recent learning</Text><View className="rounded-[26px] border border-white bg-white/85 p-5">{data.recent.slice(0,4).map((item,index)=><View key={`${item.occurredAt}-${index}`} className="mb-4 flex-row items-center last:mb-0"><View className="h-10 w-10 items-center justify-center rounded-xl bg-[#edf5ff]"><Ionicons name="checkmark" size={19} color="#146ef5"/></View><View className="ml-3 flex-1"><Text className="font-bold text-[#10233f]">{labelActivity(item.activityType)}</Text><Text className="mt-0.5 text-xs text-[#8291a4]">{item.skillType}{item.score!==null?` · ${item.score}%`:''}</Text></View></View>)}</View></>:null}
    </ScrollView>
  </SafeAreaView>;
}