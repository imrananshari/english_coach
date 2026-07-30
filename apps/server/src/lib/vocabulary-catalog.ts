export interface CuratedVocabularySeed {
  word: string;
  hindiMeaning: string;
  meaning?: string;
  register?: 'formal' | 'neutral' | 'informal' | 'slang';
}

const catalogue: Record<string, CuratedVocabularySeed[]> = {
  'Daily Conversation': [
    ['actually', 'वास्तव में'], ['perhaps', 'शायद'], ['certainly', 'निश्चित रूप से'], ['convenient', 'सुविधाजनक'],
    ['available', 'उपलब्ध'], ['appreciate', 'सराहना करना'], ['mention', 'उल्लेख करना'], ['prefer', 'पसंद करना'],
    ['suggest', 'सुझाव देना'], ['realize', 'एहसास होना'], ['wonder', 'सोचना / जानना चाहना'], ['probably', 'संभवतः'],
    ['exactly', 'बिल्कुल'], ['instead', 'इसके बजाय'], ['although', 'हालाँकि'], ['especially', 'विशेष रूप से'],
    ['otherwise', 'अन्यथा'], ['familiar', 'परिचित'], ['reasonable', 'उचित'], ['awkward', 'असहज'], ['relevant', 'प्रासंगिक'], ['obvious', 'स्पष्ट'], ['generally', 'आम तौर पर'], ['somehow', 'किसी तरह'], ['eventually', 'अंततः'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  'Office & Meetings': [
    ['agenda', 'कार्यसूची'], ['deadline', 'अंतिम समय-सीमा'], ['collaborate', 'मिलकर काम करना'], ['delegate', 'काम सौंपना'],
    ['priority', 'प्राथमिकता'], ['feedback', 'प्रतिक्रिया'], ['proposal', 'प्रस्ताव'], ['stakeholder', 'हितधारक'],
    ['alignment', 'सहमति / तालमेल'], ['milestone', 'महत्वपूर्ण पड़ाव'], ['objective', 'उद्देश्य'], ['strategy', 'रणनीति'],
    ['productive', 'उत्पादक'], ['clarify', 'स्पष्ट करना'], ['summarize', 'सार बताना'], ['coordinate', 'समन्वय करना'],
    ['consensus', 'सर्वसम्मति'], ['initiative', 'पहल'], ['deliverable', 'सौंपे जाने वाला परिणाम'], ['workflow', 'कार्यप्रवाह'], ['outcome', 'परिणाम'], ['capacity', 'क्षमता'], ['resource', 'संसाधन'], ['review', 'समीक्षा'], ['action item', 'कार्य बिंदु'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  'Business Email': [
    ['regarding', 'के संबंध में'], ['attachment', 'संलग्नक'], ['inquiry', 'पूछताछ'], ['confirmation', 'पुष्टि'],
    ['acknowledge', 'प्राप्ति स्वीकार करना'], ['forward', 'आगे भेजना'], ['recipient', 'प्राप्तकर्ता'], ['subject', 'विषय'],
    ['correspondence', 'पत्राचार'], ['professional', 'पेशेवर'], ['concise', 'संक्षिप्त'], ['courteous', 'विनम्र'],
    ['request', 'अनुरोध'], ['response', 'उत्तर'], ['notify', 'सूचित करना'], ['apologize', 'माफ़ी माँगना'],
    ['appreciation', 'आभार'], ['enclosed', 'संलग्न'], ['promptly', 'तुरंत'], ['availability', 'उपलब्धता'], ['clarification', 'स्पष्टीकरण'], ['follow-up', 'आगे की कार्रवाई'], ['schedule', 'समय तय करना'], ['revise', 'संशोधित करना'], ['deadline', 'अंतिम समय-सीमा'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning!, register: 'formal' as const })),
  'Customer Service': [
    ['assist', 'सहायता करना'], ['resolve', 'समाधान करना'], ['complaint', 'शिकायत'], ['refund', 'धन-वापसी'],
    ['replacement', 'बदली हुई वस्तु'], ['satisfaction', 'संतुष्टि'], ['issue', 'समस्या'], ['support', 'सहायता'],
    ['patient', 'धैर्यवान'], ['polite', 'विनम्र'], ['empathetic', 'सहानुभूतिपूर्ण'], ['escalate', 'उच्च स्तर पर भेजना'],
    ['warranty', 'गारंटी'], ['damaged', 'क्षतिग्रस्त'], ['delay', 'देरी'], ['apology', 'माफ़ी'],
    ['solution', 'समाधान'], ['verify', 'सत्यापित करना'], ['eligible', 'पात्र'], ['experience', 'अनुभव'], ['concern', 'चिंता'], ['inconvenience', 'असुविधा'], ['transaction', 'लेन-देन'], ['account', 'खाता'], ['policy', 'नीति'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  'Job Interviews': [
    ['qualification', 'योग्यता'], ['experience', 'अनुभव'], ['strength', 'खूबी'], ['achievement', 'उपलब्धि'],
    ['responsibility', 'जिम्मेदारी'], ['leadership', 'नेतृत्व'], ['adaptable', 'परिस्थिति के अनुसार ढलने वाला'], ['motivated', 'प्रेरित'],
    ['reliable', 'भरोसेमंद'], ['candidate', 'उम्मीदवार'], ['recruiter', 'भर्ती करने वाला'], ['position', 'पद'],
    ['salary', 'वेतन'], ['portfolio', 'कार्य-संग्रह'], ['challenge', 'चुनौती'], ['contribute', 'योगदान देना'],
    ['accomplish', 'पूरा करना'], ['demonstrate', 'दिखाना'], ['enthusiastic', 'उत्साही'], ['suitable', 'उपयुक्त'], ['skill', 'कौशल'], ['background', 'पृष्ठभूमि'], ['opportunity', 'अवसर'], ['teamwork', 'सामूहिक कार्य'], ['weakness', 'कमज़ोरी'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  Travel: [
    ['destination', 'गंतव्य'], ['itinerary', 'यात्रा कार्यक्रम'], ['departure', 'प्रस्थान'], ['arrival', 'आगमन'],
    ['reservation', 'आरक्षण'], ['accommodation', 'रहने की व्यवस्था'], ['luggage', 'सामान'], ['passport', 'पासपोर्ट'],
    ['currency', 'मुद्रा'], ['customs', 'सीमा-शुल्क विभाग'], ['journey', 'यात्रा'], ['explore', 'घूमकर देखना'],
    ['local', 'स्थानीय'], ['route', 'मार्ग'], ['delay', 'देरी'], ['cancelled', 'रद्द'],
    ['boarding', 'वाहन में चढ़ना'], ['souvenir', 'यादगार वस्तु'], ['adventure', 'रोमांच'], ['scenic', 'मनोरम'], ['visa', 'वीज़ा'], ['platform', 'प्लेटफ़ॉर्म'], ['fare', 'किराया'], ['guide', 'मार्गदर्शक'], ['abroad', 'विदेश में'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  Feelings: [
    ['delighted', 'बहुत प्रसन्न'], ['anxious', 'चिंतित'], ['frustrated', 'निराश और परेशान'], ['grateful', 'आभारी'],
    ['confident', 'आत्मविश्वासी'], ['embarrassed', 'शर्मिंदा'], ['overwhelmed', 'बहुत अधिक दबाव में'], ['relieved', 'राहत महसूस करने वाला'],
    ['curious', 'जिज्ञासु'], ['disappointed', 'निराश'], ['excited', 'उत्साहित'], ['nervous', 'घबराया हुआ'],
    ['proud', 'गर्वित'], ['calm', 'शांत'], ['lonely', 'अकेला'], ['hopeful', 'आशावान'],
    ['jealous', 'ईर्ष्यालु'], ['guilty', 'दोषी महसूस करने वाला'], ['content', 'संतुष्ट'], ['exhausted', 'बहुत थका हुआ'], ['annoyed', 'चिढ़ा हुआ'], ['surprised', 'हैरान'], ['confused', 'उलझन में'], ['satisfied', 'संतुष्ट'], ['worried', 'चिंतित'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  Technology: [
    ['device', 'उपकरण'], ['software', 'सॉफ़्टवेयर'], ['hardware', 'हार्डवेयर'], ['network', 'नेटवर्क'],
    ['database', 'डेटाबेस'], ['security', 'सुरक्षा'], ['privacy', 'गोपनीयता'], ['update', 'नया संस्करण / अद्यतन'],
    ['download', 'डाउनलोड करना'], ['upload', 'अपलोड करना'], ['backup', 'सुरक्षित प्रतिलिपि'], ['browser', 'वेब ब्राउज़र'],
    ['application', 'अनुप्रयोग'], ['digital', 'डिजिटल'], ['automate', 'स्वचालित करना'], ['compatible', 'अनुकूल'],
    ['feature', 'सुविधा'], ['interface', 'उपयोगकर्ता अंतरफलक'], ['storage', 'भंडारण'], ['connection', 'कनेक्शन'], ['algorithm', 'कलन-विधि'], ['cloud', 'क्लाउड सेवा'], ['encryption', 'कूटलेखन'], ['login', 'लॉगिन'], ['troubleshoot', 'समस्या ढूँढकर ठीक करना'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  'Study & Academic': [
    ['research', 'शोध'], ['assignment', 'कार्य'], ['analysis', 'विश्लेषण'], ['theory', 'सिद्धांत'],
    ['evidence', 'प्रमाण'], ['concept', 'अवधारणा'], ['evaluate', 'मूल्यांकन करना'], ['summarize', 'सारांश देना'],
    ['reference', 'संदर्भ'], ['source', 'स्रोत'], ['conclusion', 'निष्कर्ष'], ['method', 'विधि'],
    ['academic', 'शैक्षणिक'], ['lecture', 'व्याख्यान'], ['curriculum', 'पाठ्यक्रम'], ['revise', 'दोहराकर पढ़ना'],
    ['memorize', 'याद करना'], ['interpret', 'अर्थ समझाना'], ['accurate', 'सटीक'], ['perspective', 'दृष्टिकोण'], ['hypothesis', 'परिकल्पना'], ['citation', 'संदर्भ उद्धरण'], ['exam', 'परीक्षा'], ['thesis', 'शोध-प्रबंध'], ['knowledge', 'ज्ञान'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning!, register: 'formal' as const })),
  'Phrasal Verbs': [
    ['bring up', 'चर्चा शुरू करना'], ['carry on', 'जारी रखना'], ['figure out', 'समझना / हल निकालना'], ['find out', 'पता लगाना'],
    ['give up', 'हार मानना / छोड़ देना'], ['look after', 'देखभाल करना'], ['look into', 'जाँच करना'], ['pick up', 'सीखना / उठा लेना'],
    ['put off', 'स्थगित करना'], ['run into', 'अचानक मिलना'], ['set up', 'स्थापित करना'], ['take over', 'जिम्मेदारी संभालना'],
    ['turn down', 'अस्वीकार करना'], ['work out', 'हल निकालना'], ['follow up', 'आगे की कार्रवाई करना'], ['point out', 'ध्यान दिलाना'],
    ['come across', 'अचानक मिलना'], ['get along', 'अच्छे संबंध रखना'], ['check in', 'आगमन दर्ज करना'], ['fill out', 'फ़ॉर्म भरना'], ['log in', 'खाते में प्रवेश करना'], ['sign up', 'पंजीकरण करना'], ['hand over', 'सौंप देना'], ['sort out', 'समस्या सुलझाना'], ['back up', 'सुरक्षित प्रतिलिपि बनाना'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning! })),
  Idioms: [
    ['break the ice', 'बातचीत की झिझक दूर करना'], ['piece of cake', 'बहुत आसान काम'], ['under the weather', 'अस्वस्थ महसूस करना'], ['hit the nail on the head', 'बिल्कुल सही बात कहना'],
    ['once in a blue moon', 'बहुत कम'], ['cost an arm and a leg', 'बहुत महँगा होना'], ['spill the beans', 'राज़ खोल देना'], ['on the same page', 'एक ही समझ पर होना'],
    ['think outside the box', 'नए ढंग से सोचना'], ['back to square one', 'फिर शुरुआत पर आना'], ['call it a day', 'आज का काम समाप्त करना'], ['learn the ropes', 'काम का तरीका सीखना'],
    ['a win-win situation', 'दोनों पक्षों के लाभ की स्थिति'], ['in the long run', 'लंबे समय में'], ['up in the air', 'अभी तय न होना'], ['go the extra mile', 'अतिरिक्त प्रयास करना'],
    ['keep an eye on', 'नज़र रखना'], ['get the ball rolling', 'काम शुरू करना'], ['miss the boat', 'मौका चूक जाना'], ['bite the bullet', 'कठिन स्थिति का साहस से सामना करना'], ['beat around the bush', 'मुख्य बात से बचना'], ['pull someone’s leg', 'मज़ाक करना'], ['best of both worlds', 'दोनों ओर का लाभ'], ['make ends meet', 'आमदनी में गुज़ारा करना'], ['burn the midnight oil', 'देर रात तक काम करना'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning!, register: 'informal' as const })),
  'Gen Z & Slang': [
    ['fire', 'बेहतरीन / ज़बरदस्त'], ['vibe', 'माहौल / एहसास'], ['slay', 'बहुत शानदार करना'], ['low-key', 'चुपचाप / थोड़ा-सा'],
    ['high-key', 'खुलकर / बहुत अधिक'], ['no cap', 'सच में / बिना झूठ'], ['flex', 'दिखावा करना'], ['ghost', 'अचानक संपर्क बंद करना'],
    ['cringe', 'शर्मिंदगी पैदा करने वाला'], ['sus', 'संदिग्ध'], ['lit', 'बहुत मज़ेदार / शानदार'], ['chill', 'शांत / आरामदेह'],
    ['salty', 'नाराज़ या चिढ़ा हुआ'], ['savage', 'बेहद बेबाक'], ['glow-up', 'शानदार सकारात्मक बदलाव'], ['hype', 'बहुत उत्साह या प्रचार'],
    ['iconic', 'बहुत यादगार'], ['extra', 'ज़रूरत से ज़्यादा नाटकीय'], ['stan', 'बहुत बड़ा प्रशंसक'], ['mood', 'मेरी भावना से बिल्कुल मेल'], ['legit', 'वास्तविक / सच में अच्छा'], ['bet', 'ठीक है / पक्का'], ['rizz', 'आकर्षक बातचीत का हुनर'], ['mid', 'औसत / खास नहीं'], ['tea', 'गपशप या अंदर की खबर'],
  ].map(([word, hindiMeaning]) => ({ word: word!, hindiMeaning: hindiMeaning!, register: 'slang' as const })),
};

const specialMeanings: Record<string, string> = {
  'bring up': 'To introduce a subject for discussion.', 'carry on': 'To continue doing something.',
  'figure out': 'To understand something or find its solution.', 'find out': 'To discover information.',
  'give up': 'To stop trying or stop doing something.', 'look after': 'To take care of someone or something.',
  'look into': 'To investigate or examine something.', 'pick up': 'To collect, learn, or improve something.',
  'put off': 'To postpone something until later.', 'run into': 'To meet someone unexpectedly or encounter a problem.',
  'set up': 'To arrange, establish, or prepare something.', 'take over': 'To assume control or responsibility.',
  'turn down': 'To reject an offer or request.', 'work out': 'To find a solution or develop successfully.',
  'follow up': 'To take further action after an earlier conversation or event.', 'point out': 'To direct attention to a fact.',
  'come across': 'To find or meet someone unexpectedly.', 'get along': 'To have a friendly relationship.',
  'check in': 'To register your arrival or contact someone with an update.', 'fill out': 'To complete a form with information.',
  'break the ice': 'To make people feel comfortable at the start of a conversation.',
  'piece of cake': 'Something that is very easy to do.', 'under the weather': 'Feeling slightly ill.',
  'hit the nail on the head': 'To describe a situation or problem exactly.', 'once in a blue moon': 'Very rarely.',
  'cost an arm and a leg': 'To be extremely expensive.', 'spill the beans': 'To reveal secret information.',
  'on the same page': 'To share the same understanding or goal.', 'think outside the box': 'To think creatively in an unusual way.',
  'back to square one': 'Back to the beginning after a failed attempt.', 'call it a day': 'To stop working for the day.',
  'learn the ropes': 'To learn how a job or activity is done.', 'a win-win situation': 'A situation that benefits everyone involved.',
  'in the long run': 'Over a long period of time.', 'up in the air': 'Not decided or settled yet.',
  'go the extra mile': 'To make more effort than is normally expected.', 'keep an eye on': 'To watch something carefully.',
  'get the ball rolling': 'To start an activity or process.', 'miss the boat': 'To miss an opportunity.',
  'bite the bullet': 'To face a difficult situation with courage.',
  fire: 'Extremely good, exciting, or impressive.', vibe: 'The feeling, mood, or atmosphere of a person or place.',
  slay: 'To perform or look exceptionally well.', 'low-key': 'Quietly or without attracting much attention.',
  'high-key': 'Openly, strongly, or very noticeably.', 'no cap': 'Honestly; without exaggeration or lying.',
  flex: 'To show off an achievement or possession.', ghost: 'To suddenly stop communicating without explanation.',
  cringe: 'Embarrassing or uncomfortable to watch.', sus: 'Suspicious or difficult to trust.',
  lit: 'Very exciting, enjoyable, or excellent.', chill: 'Relaxed, calm, or easy-going.',
  salty: 'Irritated or bitter about something.', savage: 'Boldly honest or impressively ruthless.',
  'glow-up': 'A noticeable positive improvement in appearance or confidence.', hype: 'Strong excitement or publicity.',
  iconic: 'Highly memorable, recognizable, or admired.', extra: 'Overly dramatic or excessive.',
  stan: 'To be an extremely enthusiastic fan of someone.', mood: 'Something that perfectly represents how you feel.',
  'log in': 'To enter an online account using your credentials.', 'sign up': 'To register for a service or activity.',
  'hand over': 'To give control or possession to another person.', 'sort out': 'To organize something or solve a problem.',
  'back up': 'To make a safety copy of digital information.', 'beat around the bush': 'To avoid discussing the main point.',
  'pull someone’s leg': 'To jokingly make someone believe something untrue.', 'best of both worlds': 'A situation combining the advantages of two choices.',
  'make ends meet': 'To have just enough money for basic needs.', 'burn the midnight oil': 'To work or study late into the night.',
  legit: 'Genuine, truthful, or impressively good.', bet: 'An informal way to say okay, agreed, or certainly.',
  rizz: 'The ability to attract someone through charm or conversation.', mid: 'Average, mediocre, or not especially impressive.',
  tea: 'Gossip, news, or interesting private information.',
};
export function getCuratedVocabularySeeds(category: string, existingWords: string[], count: number) {
  const existing = new Set(existingWords.map((word) => word.trim().toLowerCase()));
  return (catalogue[category] ?? [])
    .filter((item) => !existing.has(item.word.toLowerCase()))
    .slice(0, count)
    .map((item) => ({ ...item, meaning: specialMeanings[item.word.toLowerCase()] }));
}
