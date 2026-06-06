import { request, getBaseUrl, isBackendConfigured } from "./client";

export interface VoiceAnalysisResult {
  symptoms: string[];
  possibleConditions: string[];
  recommendations: string[];
  transcribedText?: string;
}

const MOCK_RESULT: VoiceAnalysisResult = {
  symptoms: ["Headache", "Fatigue", "Mild fever"],
  possibleConditions: ["Common Cold", "Stress-related headache", "Dehydration"],
  recommendations: [
    "Rest and hydrate well",
    "Monitor temperature",
    "Consult a doctor if symptoms persist beyond 3 days",
  ],
};

// Note: Transcription is handled in real-time in VoiceAnalyzerPage using Web Speech API
// This function accepts the transcript directly from the component

export async function analyzeVoice(audioBlob: Blob, language: string = "en-US", transcript?: string): Promise<VoiceAnalysisResult> {
  const finalTranscript = transcript || "";
  
  if (!isBackendConfigured()) {
    if (finalTranscript) {
      return {
        ...MOCK_RESULT,
        transcribedText: finalTranscript,
        symptoms: extractSymptoms(finalTranscript, language),
        possibleConditions: analyzeSymptoms(finalTranscript, extractSymptoms(finalTranscript, language)),
        recommendations: generateRecommendations(extractSymptoms(finalTranscript, language)),
      };
    }
    return MOCK_RESULT;
  }

  if (!finalTranscript) {
    throw new Error("No transcript available. Please ensure speech recognition is enabled and try recording again.");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("medisense_token") : null;
  
  const formData = new FormData();
  formData.append("transcript", finalTranscript);
  formData.append("language", language);
  
  const url = getBaseUrl() + "/api/voice/analyze";
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: "Bearer " + token } : {},
    body: formData,
  });
  
  if (!res.ok) throw new Error("Analysis failed");
  const result = await res.json();
  return { ...result, transcribedText: finalTranscript };
}

// Helper functions for symptom extraction and analysis (fallback when backend not configured)
function extractSymptoms(text: string, language: string = "en"): string[] {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  console.log("Extracting symptoms from text:", normalizedText, "Language:", language);
  
  // Multilingual symptom patterns
  const multilingualPatterns = {
    en: [
      { patterns: ["headache", "head ache", "head pain", "migraine", "cephalgia", "throbbing head"], symptom: "Headache" },
      { patterns: ["fever", "high temperature", "feverish", "hot", "pyrexia", "temperature", "febrile"], symptom: "Fever" },
      { patterns: ["cough", "coughing", "tussis", "persistent cough", "dry cough", "wet cough"], symptom: "Cough" },
      { patterns: ["sore throat", "throat pain", "pharyngitis", "throat irritation", "scratchy throat"], symptom: "Sore throat" },
      { patterns: ["fatigue", "tired", "exhausted", "weak", "lethargy", "malaise", "weariness"], symptom: "Fatigue" },
      { patterns: ["nausea", "nauseous", "queasy", "sick to stomach", "emesis"], symptom: "Nausea" },
      { patterns: ["dizziness", "dizzy", "vertigo", "lightheaded", "unsteady"], symptom: "Dizziness" },
      { patterns: ["chills", "shivering", "rigors", "shaking", "goosebumps"], symptom: "Chills" },
      { patterns: ["congestion", "stuffy nose", "nasal congestion", "blocked nose", "rhinitis"], symptom: "Nasal congestion" },
      { patterns: ["sneezing", "sneeze", "sternutation", "runny nose"], symptom: "Sneezing" },
      { patterns: ["runny nose", "rhinorrhea", "nasal discharge", "runny nose"], symptom: "Runny nose" },
      { patterns: ["shortness of breath", "breathing difficulty", "dyspnea", "breathlessness", "wheezing"], symptom: "Shortness of breath" },
      { patterns: ["chest pain", "chest discomfort", "angina", "chest tightness", "heart pain"], symptom: "Chest pain" },
      { patterns: ["stomach pain", "abdominal pain", "belly pain", "gastralgia", "abdominal cramps"], symptom: "Abdominal pain" },
      { patterns: ["diarrhea", "loose stools", "watery stool", "frequent bowel movements"], symptom: "Diarrhea" },
      { patterns: ["vomiting", "vomit", "emesis", "throwing up", "nausea"], symptom: "Vomiting" },
      { patterns: ["joint pain", "arthralgia", "joint stiffness", "swollen joints"], symptom: "Joint pain" },
      { patterns: ["muscle pain", "myalgia", "muscle aches", "body aches", "sore muscles"], symptom: "Muscle pain" },
      { patterns: ["back pain", "backache", "lumbar pain", "spinal pain"], symptom: "Back pain" },
      { patterns: ["rash", "skin rash", "dermatitis", "hives", "urticaria"], symptom: "Rash" },
      { patterns: ["itchy", "itching", "pruritus", "scratchy skin"], symptom: "Itching" },
      { patterns: ["loss of appetite", "anorexia", "no appetite", "not hungry"], symptom: "Loss of appetite" },
      { patterns: ["insomnia", "sleeplessness", "difficulty sleeping", "can't sleep"], symptom: "Insomnia" },
      { patterns: ["anxiety", "panic", "nervousness", "worry", "stress"], symptom: "Anxiety" },
      { patterns: ["depression", "sad", "hopeless", "low mood", "depressed"], symptom: "Depression" },
    ],
    es: [
      { patterns: ["dolor de cabeza", "jaqueca", "cefalea", "migraña", "dolor de cabeza intenso", "palpitaciones en la cabeza"], symptom: "Headache" },
      { patterns: ["fiebre", "temperatura alta", "calentura", "fiebrícula", "temperatura", "escalofríos con fiebre"], symptom: "Fever" },
      { patterns: ["tos", "toser", "tos persistente", "tos seca", "tos con flema", "tosis"], symptom: "Cough" },
      { patterns: ["dolor de garganta", "garganta inflamada", "dolor faríngeo", "irritación de garganta", "ronquera"], symptom: "Sore throat" },
      { patterns: ["fatiga", "cansancio", "agotado", "debil", "cansado", "letargo", "agotamiento"], symptom: "Fatigue" },
      { patterns: ["náuseas", "náusea", "mareos", "vómitos", "malestar estomacal", "ganas de vomitar"], symptom: "Nausea" },
      { patterns: ["mareo", "vértigo", "mareado", "desmayo", "atontado", "inestable"], symptom: "Dizziness" },
      { patterns: ["escalofríos", "temblores", "tiritar", "escalofrío", "temblor", "piel de gallina"], symptom: "Chills" },
      { patterns: ["congestión nasal", "nariz tapada", "nariz congestionada", "obstrucción nasal", "rinitis"], symptom: "Nasal congestion" },
      { patterns: ["estornudos", "estornudar", "estornudo", "rinorrea", "mocos"], symptom: "Sneezing" },
      { patterns: ["moco", "nariz que corre", "secreción nasal", "rinorrea"], symptom: "Runny nose" },
      { patterns: ["dificultad para respirar", "falta de aire", "disnea", "ahogo", "respiración difícil"], symptom: "Shortness of breath" },
      { patterns: ["dolor en el pecho", "dolor pectoral", "opresión en el pecho", "dolor torácico"], symptom: "Chest pain" },
      { patterns: ["dolor de estómago", "dolor abdominal", "dolor de barriga", "cólicos", "gastralgia"], symptom: "Abdominal pain" },
      { patterns: ["diarrea", "heces líquidas", "evacuaciones frecuentes", "sueltas"], symptom: "Diarrhea" },
      { patterns: ["vómitos", "vomitar", "emesis", "devolver", "arcadas"], symptom: "Vomiting" },
      { patterns: ["dolor de articulaciones", "dolor articular", "artralgia", "articulaciones inflamadas"], symptom: "Joint pain" },
      { patterns: ["dolor muscular", "dolor en los músculos", "mialgia", "calambres"], symptom: "Muscle pain" },
      { patterns: ["dolor de espalda", "dolor lumbar", "lumbalgia", "espalda"], symptom: "Back pain" },
      { patterns: ["erupción cutánea", "sarpullido", "rash", "urticaria", "habón"], symptom: "Rash" },
      { patterns: ["picazón", "comezón", "prurito", "irritación en la piel"], symptom: "Itching" },
      { patterns: ["pérdida de apetito", "anorexia", "sin hambre", "no tengo ganas de comer"], symptom: "Loss of appetite" },
      { patterns: ["insomnio", "dificultad para dormir", "no puedo dormir", "desvelo"], symptom: "Insomnia" },
      { patterns: ["ansiedad", "nerviosismo", "pánico", "estrés", "preocupación"], symptom: "Anxiety" },
      { patterns: ["depresión", "tristeza", "deprimido", "bajo estado de ánimo"], symptom: "Depression" },
    ],
    fr: [
      { patterns: ["mal de tête", "céphalée", "douleur à la tête", "migraine", "céphalalgie", "douleur crânienne"], symptom: "Headache" },
      { patterns: ["fièvre", "température élevée", "fiévreux", "pyrexie", "fébricule", "chaleur"], symptom: "Fever" },
      { patterns: ["toux", "tousser", "toux persistante", "toux sèche", "toux grasse", "tussis"], symptom: "Cough" },
      { patterns: ["mal de gorge", "gorge irritée", "pharyngite", "douleur pharyngée", "gorge enflammée"], symptom: "Sore throat" },
      { patterns: ["fatigue", "fatigué", "épuisé", "faible", "lassitude", "épuisement", "courbatures"], symptom: "Fatigue" },
      { patterns: ["nausées", "nausée", "envie de vomir", "mal au cœur", "nauséeux"], symptom: "Nausea" },
      { patterns: ["vertiges", "étourdi", "vertigineux", "étourdissement", "déséquilibre"], symptom: "Dizziness" },
      { patterns: ["frissons", "tremblements", "grelotter", "frisson", "chair de poule"], symptom: "Chills" },
      { patterns: ["congestion nasale", "nez bouché", "obstruction nasale", "rhinite", "nez congestionné"], symptom: "Nasal congestion" },
      { patterns: ["éternuements", "éternuer", "éternuement", "rhinite allergique"], symptom: "Sneezing" },
      { patterns: ["nez qui coule", "rhume", "rhinorrhée", "écoulement nasal"], symptom: "Runny nose" },
      { patterns: ["essoufflement", "difficulté à respirer", "dyspnée", "manque de souffle"], symptom: "Shortness of breath" },
      { patterns: ["douleur thoracique", "mal à la poitrine", "douleur au thorax", "angine de poitrine"], symptom: "Chest pain" },
      { patterns: ["mal d'estomac", "douleur abdominale", "douleur gastrique", "crampes abdominales"], symptom: "Abdominal pain" },
      { patterns: ["diarrhée", "selles liquides", "troubles intestinaux", "évacuations fréquentes"], symptom: "Diarrhea" },
      { patterns: ["vomissements", "vomir", "émèse", "rejets", "nausées"], symptom: "Vomiting" },
      { patterns: ["douleurs articulaires", "arthralgie", "articulations douloureuses", "arthrite"], symptom: "Joint pain" },
      { patterns: ["douleurs musculaires", "myalgie", "courbatures", "muscles endoloris"], symptom: "Muscle pain" },
      { patterns: ["mal de dos", "douleur lombaire", "lombalgie", "douleur vertébrale"], symptom: "Back pain" },
      { patterns: ["éruption cutanée", "rash", "urticaire", "démangeaisons", "dermatite"], symptom: "Rash" },
      { patterns: ["démangeaisons", "prurit", "démangeaison", "peau qui gratte"], symptom: "Itching" },
      { patterns: ["perte d'appétit", "anorexie", "pas faim", "manque d'appétit"], symptom: "Loss of appetite" },
      { patterns: ["insomnie", "difficulté à dormir", "nuits blanches", "sommeil perturbé"], symptom: "Insomnia" },
      { patterns: ["anxiété", "nervosité", "angoisse", "stress", "inquiétude"], symptom: "Anxiety" },
      { patterns: ["dépression", "tristesse", "humeur basse", "déprimé", "abattement"], symptom: "Depression" },
    ],
    hi: [
      { patterns: ["सिर दर्द", "सिरदर्द", "शीर शोख", "सर दर्द", "सरदर्द", "सर में दर्द", "सिर में दर्द", "आधा सिर दर्द"], symptom: "Headache" },
      { patterns: ["बुखार", "ज्वर", "तापमान ऊँचा", "बुखार है", "ज्वर है", "शरीर में ताप", "गर्मी लगना"], symptom: "Fever" },
      { patterns: ["खांसी", "खाँसना", "खांस रहा हूँ", "खांस रही हूँ", "खांस आ रही है", "कफ", "खांसी का दौरा"], symptom: "Cough" },
      { patterns: ["गले में दर्द", "गला खराब", "गले में खराश", "गला सूखा", "गला लाल", "गले में जलन"], symptom: "Sore throat" },
      { patterns: ["थकान", "थका हुआ", "कमज़ोरी", "थक गया हूँ", "थक गई हूँ", "बहुत थकान", "शरीर थका हुआ"], symptom: "Fatigue" },
      { patterns: ["उल्टी का मन", "जी मिचलाना", "मिचली रही है", "उल्टी आ रही है", "उल्टी होना"], symptom: "Nausea" },
      { patterns: ["चक्कर आना", "घूमना", "बेहोशी", "बेहोश", "सिर चक्कर आ रहा है", "बेहोश होना"], symptom: "Dizziness" },
      { patterns: ["ठंड लगना", "कांपना", "कपकपी", "ठंड लग रही है", "शरीर कांप रहा है", "ठंड ठंड लग रही है"], symptom: "Chills" },
      { patterns: ["नाक बंद होना", "नाक भरी होना", "नाक बंद है", "नाक नहीं चल रही", "नाक जाम"], symptom: "Nasal congestion" },
      { patterns: ["छींक", "छींकना", "छींक आ रही है", "छींक रहा हूँ", "छींक आ रहा है"], symptom: "Sneezing" },
      { patterns: ["नाक बहना", "नाक से पानी गिरना", "नाक बह रही है", "नाक से पानी आना"], symptom: "Runny nose" },
      { patterns: ["सांस फूलना", "सांस लेने में तकलीफ", "सांस नहीं लग रही", "सांस घुट रही है", "सांस लेना मुश्किल"], symptom: "Shortness of breath" },
      { patterns: ["सीने में दर्द", "छाती में दर्द", "छाती दर्द", "सीना दर्द", "छाती में जलन"], symptom: "Chest pain" },
      { patterns: ["पेट दर्द", "पेट में दर्द", "पेट दर्द है", "पेट में जलन", "पेट खराब", "pet dard", "पेट मुड़ रहा है"], symptom: "Abdominal pain" },
      { patterns: ["दस्त", "पतली दस्त", "दस्त लग रहा है", "पेट से दस्त", "पतले दस्त"], symptom: "Diarrhea" },
      { patterns: ["उल्टी", "उल्टी करना", "उल्टी हो रही है", "उल्टी कर दी", "उल्टी आई"], symptom: "Vomiting" },
      { patterns: ["जोड़ों में दर्द", "गठिया दर्द", "जोड़ों का दर्द", "गठिया में दर्द"], symptom: "Joint pain" },
      { patterns: ["मांसपेशियों में दर्द", "शरीर दर्द", "मांसपेशी दर्द", "शरीर दुख रहा है"], symptom: "Muscle pain" },
      { patterns: ["पीठ दर्द", "कमर दर्द", "पीठ में दर्द", "कमर में दर्द"], symptom: "Back pain" },
      { patterns: ["चकती", "खुजली", "रैशेस", "खुजली होना", "चर्म रोग"], symptom: "Rash" },
      { patterns: ["खुजली", "खुजलना", "चमड़ी", "त्वचा में खुजली"], symptom: "Itching" },
      { patterns: ["भूख न लगना", "भूख नहीं लग रहा", "भूख कम होना", "भूख खत्म"], symptom: "Loss of appetite" },
      { patterns: ["नींद न आना", "बेसुबी", "नींद नहीं आ रही", "रात भर जागना"], symptom: "Insomnia" },
      { patterns: ["चिंता", "घबराहट", "तनाव", "परेशान", "डर"], symptom: "Anxiety" },
      { patterns: ["उदासीनता", "उदास", "मन नहीं लगना", "दुखी", "उदासीन"], symptom: "Depression" },
    ],
    zh: [
      { patterns: ["头痛", "头疼", "头部疼痛", "偏头痛", "头胀痛", "头剧烈疼痛"], symptom: "Headache" },
      { patterns: ["发烧", "高烧", "发热", "体温高", "发烧发热", "体温升高"], symptom: "Fever" },
      { patterns: ["咳嗽", "咳", "干咳", "湿咳", "持续咳嗽", "咳嗽不止"], symptom: "Cough" },
      { patterns: ["喉咙痛", "嗓子痛", "咽喉疼痛", "喉咙发炎", "喉咙干燥"], symptom: "Sore throat" },
      { patterns: ["疲劳", "累", "疲惫", "虚弱", "疲倦", "乏力", "精疲力竭"], symptom: "Fatigue" },
      { patterns: ["恶心", "想吐", "恶心想吐", "胃不舒服", "反胃"], symptom: "Nausea" },
      { patterns: ["头晕", "眩晕", "头昏", "头昏眼花", "站立不稳"], symptom: "Dizziness" },
      { patterns: ["发冷", "寒战", "打哆嗦", "畏寒", "寒颤", "浑身发冷"], symptom: "Chills" },
      { patterns: ["鼻塞", "鼻子不通气", "鼻堵", "鼻塞不通", "鼻孔堵塞"], symptom: "Nasal congestion" },
      { patterns: ["打喷嚏", "喷嚏", "喷嚏不止", "连续打喷嚏"], symptom: "Sneezing" },
      { patterns: ["流鼻涕", "鼻涕", "鼻流涕", "鼻涕不止"], symptom: "Runny nose" },
      { patterns: ["呼吸困难", "气短", "喘不过气", "呼吸急促", "胸闷气短"], symptom: "Shortness of breath" },
      { patterns: ["胸痛", "胸口痛", "胸部疼痛", "胸闷胸痛", "心口痛"], symptom: "Chest pain" },
      { patterns: ["腹痛", "肚子痛", "胃痛", "腹部疼痛", "肚子不舒服"], symptom: "Abdominal pain" },
      { patterns: ["腹泻", "拉肚子", "拉稀", "腹泻不止", "水样便"], symptom: "Diarrhea" },
      { patterns: ["呕吐", "吐", "恶心呕吐", "呕吐不止"], symptom: "Vomiting" },
      { patterns: ["关节痛", "关节疼痛", "关节肿胀", "关节不适"], symptom: "Joint pain" },
      { patterns: ["肌肉痛", "肌肉酸痛", "全身酸痛", "肌肉疼痛"], symptom: "Muscle pain" },
      { patterns: ["背痛", "腰痛", "背部疼痛", "腰酸背痛"], symptom: "Back pain" },
      { patterns: ["皮疹", "红疹", "皮肤过敏", "皮肤发红", "起疹子"], symptom: "Rash" },
      { patterns: ["瘙痒", "皮肤痒", "发痒", "皮肤瘙痒"], symptom: "Itching" },
      { patterns: ["食欲不振", "没胃口", "不想吃饭", "食欲下降"], symptom: "Loss of appetite" },
      { patterns: ["失眠", "睡不着", "睡眠困难", "夜不能寐"], symptom: "Insomnia" },
      { patterns: ["焦虑", "紧张", "担心", "不安", "焦虑不安"], symptom: "Anxiety" },
      { patterns: ["抑郁", "沮丧", "情绪低落", "不开心", "心情抑郁"], symptom: "Depression" },
    ],
    ar: [
      { patterns: ["صداع", "ألم في الرأس", "صداع نصفي", "صداع شديد", "ألم الرأس"], symptom: "Headache" },
      { patterns: ["حمى", "حرارة عالية", "سخونة", "حمى", "ارتفاع درجة الحرارة", "شعور بالحرارة"], symptom: "Fever" },
      { patterns: ["سعال", "كحة", "سعال جاف", "سعال بلغم", "سعال مستمر"], symptom: "Cough" },
      { patterns: ["ألم في الحلق", "التهاب الحلق", "حلق مؤلم", "احتقان الحلق"], symptom: "Sore throat" },
      { patterns: ["إرهاق", "تعب", "إجهاد", "ضعف", "إرهاق شديد", "خمول"], symptom: "Fatigue" },
      { patterns: ["غثيان", "شعور بالغثيان", "رغبة في القيء", "غثيان مستمر"], symptom: "Nausea" },
      { patterns: ["دوخة", "دوار", "شعور بالدوار", "دوخة", "عدم توازن"], symptom: "Dizziness" },
      { patterns: ["قشعريرة", "رعشة", "ارتجاف", "رعشة", "ارتعاش", "قشعريرة"], symptom: "Chills" },
      { patterns: ["احتقان الأنف", "انسداد الأنف", "أنف مسدود", "احتقان", "انسداد"], symptom: "Nasal congestion" },
      { patterns: ["عطس", "عطاس", "عطاس مستمر", "عطاس متكرر"], symptom: "Sneezing" },
      { patterns: ["سيلان الأنف", "رشح", "سيلان", "إفرازات أنفية"], symptom: "Runny nose" },
      { patterns: ["ضيق في التنفس", "صعوبة في التنفس", "ضيق نفس", "صعوبة التنفس"], symptom: "Shortness of breath" },
      { patterns: ["ألم في الصدر", "ألم صدري", "ألم الصدر", "ضيق في الصدر"], symptom: "Chest pain" },
      { patterns: ["ألم في المعدة", "ألم بطني", "معدة مؤلمة", "ألم البطن"], symptom: "Abdominal pain" },
      { patterns: ["إسهال", "براز سائل", "إسهال مستمر", "براز رخو"], symptom: "Diarrhea" },
      { patterns: ["قيء", "تقيؤ", "غثيان وقيء", "تقيؤ مستمر"], symptom: "Vomiting" },
      { patterns: ["ألم المفاصل", "التهاب المفاصل", "مفاصل مؤلمة", "آلام مفصلية"], symptom: "Joint pain" },
      { patterns: ["ألم العضلات", "آلام عضلية", "عضلات مؤلمة", "تشنج العضلات"], symptom: "Muscle pain" },
      { patterns: ["ألم الظهر", "آلام الظهر", "ظهر مؤلم", "ألم أسفل الظهر"], symptom: "Back pain" },
      { patterns: ["طفح جلدي", "طفح", "حساسية جلدية", "احمرار الجلد"], symptom: "Rash" },
      { patterns: ["حكة", "هرش", "حكة جلد", "هرش جلدي"], symptom: "Itching" },
      { patterns: ["فقدان الشهية", "لا شهية", "فقدان شهية", "عدم الرغبة في الأكل"], symptom: "Loss of appetite" },
      { patterns: ["أرق", "صعوبة النوم", "الأرق", "عدم القدرة على النوم"], symptom: "Insomnia" },
      { patterns: ["قلق", "توتر", "خوف", "قلق مستمر", "توتر عصبي"], symptom: "Anxiety" },
      { patterns: ["اكتئاب", "حزن", "اكتئاب", "مزاج سيء", "شعور باليأس"], symptom: "Depression" },
    ]
  };

  // Detect language from input or use provided language
  let detectedLang = "en";
  if (language && language !== "auto") {
    detectedLang = language.split("-")[0]; // Extract primary language code
  } else {
    // Auto-detect language by checking for common words/phrases in each language
    for (const [langCode, patterns] of Object.entries(multilingualPatterns)) {
      for (const { patterns: symptomPatterns } of patterns) {
        for (const pattern of symptomPatterns) {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(normalizedText)) {
            detectedLang = langCode;
            console.log("Auto-detected language:", detectedLang, "from pattern:", pattern);
            break;
          }
        }
        if (detectedLang !== "en") break;
      }
      if (detectedLang !== "en") break;
    }
  }
  
  console.log("Using language patterns for:", detectedLang);
  const patterns = multilingualPatterns[detectedLang as keyof typeof multilingualPatterns] || multilingualPatterns.en;
  
  const foundSymptoms: string[] = [];
  const symptomSet = new Set();
  
  for (const { patterns: symptomPatterns, symptom } of patterns) {
    for (const pattern of symptomPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(normalizedText) && !symptomSet.has(symptom)) {
        foundSymptoms.push(symptom);
        symptomSet.add(symptom);
        console.log("Found symptom:", symptom, "from pattern:", pattern);
        break;
      }
    }
  }

  console.log("Final symptoms found:", foundSymptoms);
  return foundSymptoms.length > 0 ? foundSymptoms : [];
}

function analyzeSymptoms(text: string, symptoms: string[]): string[] {
  const lowerText = text.toLowerCase();
  const conditions: string[] = [];
  const conditionScores = new Map();

  // Score conditions based on symptom combinations
  if ((symptoms.includes("Fever") || symptoms.includes("Chills")) && 
      (symptoms.includes("Cough") || symptoms.includes("Sore throat"))) {
    conditionScores.set("Common Cold or Flu", 5);
  }
  if (symptoms.includes("Headache")) {
    if (lowerText.includes("stress") || lowerText.includes("tension")) {
      conditionScores.set("Tension Headache", 4);
    } else if (lowerText.includes("migraine") || lowerText.includes("throbbing")) {
      conditionScores.set("Migraine", 4);
    } else {
      conditionScores.set("Headache", 3);
    }
  }
  if (symptoms.includes("Nausea") || symptoms.includes("Diarrhea") || symptoms.includes("Vomiting") || symptoms.includes("Abdominal pain")) {
    conditionScores.set("Gastrointestinal Issue", 4);
  }
  if (symptoms.includes("Chest pain")) {
    conditionScores.set("Chest-related Condition", 5);
  }
  if (symptoms.includes("Shortness of breath")) {
    conditionScores.set("Respiratory Issue", 4);
  }
  if (symptoms.includes("Cough") && symptoms.includes("Fever")) {
    conditionScores.set("Bronchitis or Pneumonia", 5);
  }
  if (symptoms.includes("Sore throat") && symptoms.includes("Fever")) {
    conditionScores.set("Throat Infection", 4);
  }
  if (symptoms.includes("Nasal congestion") && symptoms.includes("Sneezing")) {
    conditionScores.set("Allergic Rhinitis", 4);
  }
  if (symptoms.includes("Dizziness") && symptoms.includes("Fatigue")) {
    conditionScores.set("Dehydration or Anemia", 3);
  }

  // Sort by score and return top conditions
  const sorted = Array.from(conditionScores.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 
    ? sorted.slice(0, 5).map(([name]) => name)
    : ["Please describe your symptoms more specifically"];
}

function generateRecommendations(symptoms: string[]): string[] {
  const recommendations: string[] = [];
  
  // Symptom-specific recommendations
  if (symptoms.includes("Fever")) {
    recommendations.push("Monitor your temperature regularly. If it exceeds 103°F (39.4°C), seek medical attention");
    recommendations.push("Stay hydrated with water, herbal tea, or electrolyte drinks");
    recommendations.push("Rest in a cool, comfortable environment and wear light clothing");
  }
  
  if (symptoms.includes("Cough")) {
    recommendations.push("Use a humidifier or take steam inhalation to relieve respiratory symptoms");
    recommendations.push("Avoid irritants like smoke and ensure good air quality");
    recommendations.push("Try honey and warm liquids to soothe the throat");
  }
  
  if (symptoms.includes("Sore throat")) {
    recommendations.push("Gargle with warm salt water several times a day");
    recommendations.push("Drink warm liquids like tea with honey to soothe throat irritation");
    recommendations.push("Avoid spicy or acidic foods that may irritate the throat");
  }
  
  if (symptoms.includes("Nausea") || symptoms.includes("Vomiting")) {
    recommendations.push("Eat small, frequent meals and avoid heavy, greasy foods");
    recommendations.push("Try ginger tea or crackers to help settle your stomach");
    recommendations.push("Stay hydrated with small sips of clear liquids");
  }
  
  if (symptoms.includes("Diarrhea")) {
    recommendations.push("Follow a BRAT diet (bananas, rice, applesauce, toast) and stay hydrated");
    recommendations.push("Avoid dairy, spicy, and fatty foods until symptoms improve");
    recommendations.push("Monitor for signs of dehydration and seek medical help if severe");
  }
  
  if (symptoms.includes("Headache")) {
    recommendations.push("Rest in a dark, quiet room and apply a cold or warm compress");
    recommendations.push("Ensure adequate hydration as dehydration can worsen headaches");
    recommendations.push("Practice relaxation techniques if stress-related");
  }
  
  if (symptoms.includes("Fatigue")) {
    recommendations.push("Ensure you get 7-9 hours of quality sleep per night");
    recommendations.push("Maintain a balanced diet rich in iron and B vitamins");
    recommendations.push("Consider light exercise and stress management techniques");
  }
  
  if (symptoms.includes("Dizziness")) {
    recommendations.push("Sit or lie down immediately when you feel dizzy to prevent falls");
    recommendations.push("Stay well hydrated and avoid sudden position changes");
    recommendations.push("Monitor blood pressure and consult a doctor if persistent");
  }
  
  if (symptoms.includes("Chest pain")) {
    recommendations.push("⚠️ Chest pain requires immediate medical evaluation. Seek emergency care if severe");
    recommendations.push("Avoid physical exertion until evaluated by a healthcare professional");
  }
  
  if (symptoms.includes("Shortness of breath")) {
    recommendations.push("⚠️ Difficulty breathing requires immediate medical attention");
    recommendations.push("Sit upright and use pursed-lip breathing techniques while waiting for help");
  }
  
  if (symptoms.includes("Nasal congestion")) {
    recommendations.push("Use saline nasal sprays or steam inhalation to relieve congestion");
    recommendations.push("Elevate your head while sleeping to improve breathing");
    recommendations.push("Consider over-the-counter decongestants if appropriate");
  }
  
  // General wellness recommendations
  recommendations.push("Keep a symptom diary to track when symptoms occur and their severity");
  recommendations.push("If symptoms persist for more than 5-7 days or worsen, consult a healthcare professional");
  recommendations.push("Maintain good hygiene practices to prevent spreading infections");

  return recommendations.slice(0, 8);
}

export async function saveVoiceToDashboard(analysisId: string): Promise<{ success: boolean }> {
  if (!isBackendConfigured()) return Promise.resolve({ success: true });
  return request<{ success: boolean }>("/api/voice/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId }),
  });
}
