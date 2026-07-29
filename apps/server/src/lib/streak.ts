type ProgressDay = {
  progressDate: string;
  learningMinutes: number;
  lessonsCompleted: number;
  wordsLearned: number;
  speakingMinutes: number;
};

function shiftUtcDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function activeDay(day: ProgressDay) {
  return day.learningMinutes > 0 || day.lessonsCompleted > 0 || day.wordsLearned > 0 || day.speakingMinutes > 0;
}

export function calculateLearningStreak(days: ProgressDay[], dailyGoal: number) {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map(days.map((day) => [day.progressDate, day]));
  const activeDates = new Set(days.filter(activeDay).map((day) => day.progressDate));
  const yesterday = shiftUtcDate(today, -1);
  let currentStreak = 0;
  let cursor = activeDates.has(today) ? today : activeDates.has(yesterday) ? yesterday : '';
  while (cursor && activeDates.has(cursor)) {
    currentStreak += 1;
    cursor = shiftUtcDate(cursor, -1);
  }

  const sortedActive = [...activeDates].sort();
  let longestStreak = 0;
  let run = 0;
  let previous = '';
  for (const date of sortedActive) {
    run = previous && shiftUtcDate(previous, 1) === date ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftUtcDate(today, index - 6);
    const day = byDate.get(date);
    const minutes = day?.learningMinutes ?? 0;
    return {
      date,
      dayLabel: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`)).slice(0, 1),
      minutes,
      active: day ? activeDay(day) : false,
      goalReached: minutes >= dailyGoal,
      isToday: date === today,
    };
  });
  const todayProgress = byDate.get(today);
  const todayMinutes = todayProgress?.learningMinutes ?? 0;
  return {
    currentStreak,
    longestStreak,
    todayMinutes,
    remainingMinutes: Math.max(0, dailyGoal - todayMinutes),
    goalPercentage: Math.min(100, Math.round((todayMinutes / Math.max(1, dailyGoal)) * 100)),
    goalReached: todayMinutes >= dailyGoal,
    activeDaysThisWeek: week.filter((day) => day.active).length,
    week,
  };
}