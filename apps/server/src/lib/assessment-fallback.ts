import type { GeneratedAssessmentQuestion } from './assessment-generator';

type GrammarSource = {
  title: string;
  practiceQuestions: Array<{ question: string; options: string[]; answer: number; explanation: string }>;
};
type VocabularySource = { word: string; meaning: string; example: string | null };
type OptionId = 'a' | 'b' | 'c' | 'd';
const optionIds: OptionId[] = ['a', 'b', 'c', 'd'];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  }
  return copy;
}
function id(prefix: string, index: number) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}-${index}`;
}
function choiceOptions(texts: string[], correctText: string) {
  const unique = [...new Set(texts.map((text) => text.trim().slice(0, 160)).filter(Boolean))];
  const fillers = ['a scheduled place for a meeting', 'a person who manages a building', 'an informal greeting used with friends'];
  for (const filler of fillers) if (unique.length < 4 && !unique.includes(filler)) unique.push(filler);
  const choices = unique.slice(0, 4);
  const correct = correctText.trim().slice(0, 160);
  if (!choices.includes(correct)) choices[0] = correct;
  const shuffled = shuffle(choices);
  const correctIndex = shuffled.indexOf(correct);
  return {
    options: shuffled.map((text, index) => ({ id: optionIds[index]!, text })),
    answer: optionIds[correctIndex]!,
  };
}

const grammarBackups: Omit<GeneratedAssessmentQuestion, 'id'>[] = [
  { skill: 'grammar', prompt: 'Choose the correct sentence.', options: [{ id: 'a', text: 'She go to work every day.' }, { id: 'b', text: 'She goes to work every day.' }, { id: 'c', text: 'She going to work every day.' }, { id: 'd', text: 'She gone to work every day.' }], answer: 'b', explanation: 'Use goes with she in the simple present.', spokenText: null },
  { skill: 'grammar', prompt: 'Complete: I ___ the report yesterday.', options: [{ id: 'a', text: 'finish' }, { id: 'b', text: 'have finish' }, { id: 'c', text: 'finished' }, { id: 'd', text: 'finishing' }], answer: 'c', explanation: 'Yesterday requires the simple past: finished.', spokenText: null },
  { skill: 'grammar', prompt: 'Choose the correct conditional sentence.', options: [{ id: 'a', text: 'If I have time, I will call you.' }, { id: 'b', text: 'If I will have time, I call you.' }, { id: 'c', text: 'If I had time, I will call you.' }, { id: 'd', text: 'If I having time, I call you.' }], answer: 'a', explanation: 'The first conditional uses present simple after if and will in the result.', spokenText: null },
  { skill: 'grammar', prompt: 'Which sentence uses the present perfect correctly?', options: [{ id: 'a', text: 'I have sent the email.' }, { id: 'b', text: 'I have send the email.' }, { id: 'c', text: 'I has sent the email.' }, { id: 'd', text: 'I am sent the email.' }], answer: 'a', explanation: 'Present perfect uses have or has plus the past participle.', spokenText: null },
  { skill: 'grammar', prompt: 'Choose the correct article: She is ___ engineer.', options: [{ id: 'a', text: 'a' }, { id: 'b', text: 'an' }, { id: 'c', text: 'the one' }, { id: 'd', text: 'no article' }], answer: 'b', explanation: 'Engineer begins with a vowel sound, so use an.', spokenText: null },
];

const vocabularyBackups: VocabularySource[] = [
  { word: 'deadline', meaning: 'the latest time by which work must be completed', example: 'The project deadline is Friday.' },
  { word: 'clarify', meaning: 'to make an idea easier to understand', example: 'Could you clarify the final requirement?' },
  { word: 'reliable', meaning: 'consistently dependable or trustworthy', example: 'She is a reliable team member.' },
  { word: 'prioritize', meaning: 'to decide what is most important and do it first', example: 'We should prioritize urgent customer requests.' },
  { word: 'concise', meaning: 'clear and brief without unnecessary words', example: 'Keep the email concise.' },
  { word: 'collaborate', meaning: 'to work together toward a shared result', example: 'The teams collaborate on product launches.' },
];

const workplaceBank: Omit<GeneratedAssessmentQuestion, 'id'>[] = [
  { skill: 'workplace', prompt: 'You need more time for a task. Which message is most professional?', options: [{ id: 'a', text: 'I cannot do it. Wait.' }, { id: 'b', text: 'Could we extend the deadline to Friday? I need one more day to complete the review.' }, { id: 'c', text: 'Deadline is bad.' }, { id: 'd', text: 'Maybe later.' }], answer: 'b', explanation: 'A professional request is polite, specific, and gives a reason and revised date.', spokenText: null },
  { skill: 'workplace', prompt: 'Which phrase politely asks a colleague to explain something again?', options: [{ id: 'a', text: 'You make no sense.' }, { id: 'b', text: 'Say again.' }, { id: 'c', text: 'Could you clarify the last point, please?' }, { id: 'd', text: 'Whatever.' }], answer: 'c', explanation: 'Could you clarify is a polite and constructive workplace request.', spokenText: null },
  { skill: 'workplace', prompt: 'What is the clearest way to give a project update?', options: [{ id: 'a', text: 'Things are happening.' }, { id: 'b', text: 'The design is complete, and development will begin tomorrow.' }, { id: 'c', text: 'It is fine probably.' }, { id: 'd', text: 'No update.' }], answer: 'b', explanation: 'A useful update states the current status and the next action.', spokenText: null },
  { skill: 'workplace', prompt: 'Which closing is suitable for a professional email?', options: [{ id: 'a', text: 'Reply now!' }, { id: 'b', text: 'Okay bye.' }, { id: 'c', text: 'Thank you for your time. Kind regards,' }, { id: 'd', text: 'Whatever works.' }], answer: 'c', explanation: 'A courteous thank-you and professional closing suit workplace email.', spokenText: null },
];

const listeningBank: Omit<GeneratedAssessmentQuestion, 'id'>[] = [
  { skill: 'listening', prompt: 'Listen and choose the main action.', options: [{ id: 'a', text: 'Cancel the project' }, { id: 'b', text: 'Send the revised report before 3 p.m.' }, { id: 'c', text: 'Book a flight' }, { id: 'd', text: 'Call a customer tomorrow' }], answer: 'b', explanation: 'The speaker asks for the revised report before 3 p.m.', spokenText: 'Please send me the revised report before three this afternoon so I can review it before the meeting.' },
  { skill: 'listening', prompt: 'Listen and choose when the meeting will happen.', options: [{ id: 'a', text: 'Monday morning' }, { id: 'b', text: 'Tuesday afternoon' }, { id: 'c', text: 'Wednesday evening' }, { id: 'd', text: 'Friday morning' }], answer: 'b', explanation: 'The message moves the meeting to Tuesday afternoon.', spokenText: 'The client cannot attend on Monday, so we have moved the meeting to Tuesday afternoon at two.' },
  { skill: 'listening', prompt: 'Listen and identify the problem.', options: [{ id: 'a', text: 'The attachment is missing' }, { id: 'b', text: 'The office is closed' }, { id: 'c', text: 'The meeting is cancelled' }, { id: 'd', text: 'The password has expired' }], answer: 'a', explanation: 'The speaker says that the attachment was not included.', spokenText: 'Thanks for the email. I can see your message, but the document you mentioned was not attached.' },
];

export function generateCurriculumAssessment(input: {
  grammar: GrammarSource[];
  vocabulary: VocabularySource[];
  selectedGoal: string;
  previousPrompts: string[];
}): GeneratedAssessmentQuestion[] {
  const recent = new Set(input.previousPrompts.map((prompt) => prompt.trim().toLowerCase()));
  const grammarFromNeon = input.grammar.flatMap((topic) => topic.practiceQuestions
    .filter((question) => question.options.length === 4 && question.answer >= 0 && question.answer < 4)
    .map((question): Omit<GeneratedAssessmentQuestion, 'id'> => ({
      skill: 'grammar',
      prompt: question.question.slice(0, 280),
      options: question.options.map((text, index) => ({ id: optionIds[index]!, text: text.slice(0, 160) })),
      answer: optionIds[question.answer]!,
      explanation: `${topic.title}: ${question.explanation}`.slice(0, 320),
      spokenText: null,
    })));
  const grammarPool = [...grammarFromNeon, ...grammarBackups].filter((item) => !recent.has(item.prompt.toLowerCase()));
  const grammarQuestions = shuffle(grammarPool.length >= 4 ? grammarPool : [...grammarFromNeon, ...grammarBackups]).slice(0, 4);

  const vocabularyPool = [...input.vocabulary, ...vocabularyBackups]
    .filter((item, index, items) => items.findIndex((entry) => entry.word.toLowerCase() === item.word.toLowerCase()) === index);
  const vocabularyQuestions = shuffle(vocabularyPool).slice(0, 3).map((word) => {
    const distractors = shuffle(vocabularyPool.filter((item) => item.word !== word.word)).slice(0, 3).map((item) => item.meaning);
    const choice = choiceOptions([word.meaning, ...distractors], word.meaning);
    return {
      skill: 'vocabulary' as const,
      prompt: `Which meaning best matches "${word.word}"?`,
      ...choice,
      explanation: `${word.word} means ${word.meaning}.${word.example ? ` Example: ${word.example}` : ''}`.slice(0, 320),
      spokenText: null,
    };
  });

  const workplace = shuffle(workplaceBank.filter((item) => !recent.has(item.prompt.toLowerCase()))).slice(0, 2);
  const selectedWorkplace = workplace.length === 2 ? workplace : shuffle(workplaceBank).slice(0, 2);
  const listening = shuffle(listeningBank)[0]!;
  const questions = [...grammarQuestions, ...vocabularyQuestions, ...selectedWorkplace, listening];
  return shuffle(questions).map((question, index) => ({
    ...question,
    id: id('fallback', index),
    explanation: `${question.explanation} Goal: ${input.selectedGoal}.`.slice(0, 320),
  }));
}