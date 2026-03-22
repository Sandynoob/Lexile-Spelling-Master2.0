import { GoogleGenAI, Type } from "@google/genai";

/**
 * Lexile Master - Hybrid Phonics Engine
 * Optimized for Mainland China: Local First, AI Enhanced.
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const SEGMENTS_CACHE_KEY = 'lexile_segments_cache_v2';

export const playAmericanPronunciation = (word: string) => {
  if (typeof window === 'undefined') return;
  const wordClean = word.trim().toLowerCase();

  // 1. Primary: Youdao Online Audio (Very stable in China)
  try {
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordClean)}&type=2`;
    let audio: HTMLAudioElement | null = new Audio(audioUrl);
    
    audio.onended = () => { audio = null; };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        safeSystemTTS(wordClean);
      });
    }
  } catch (err) {
    safeSystemTTS(wordClean);
  }
};

function safeSystemTTS(word: string) {
  try {
    const w = window as any;
    const synth = w['speechSynthesis'];
    if (synth && typeof synth === 'object') {
      if (typeof synth.cancel === 'function') {
        try { synth.cancel(); } catch (e) {}
      }
      const Utterance = w['SpeechSynthesisUtterance'];
      if (Utterance && typeof synth.speak === 'function') {
        const u = new Utterance(word);
        u.lang = 'en-US';
        u.rate = 0.8;
        synth.speak(u);
      }
    }
  } catch (e) {
    console.warn("TTS failed silently.");
  }
}

/**
 * Robust Local Phonics Engine
 * Used for instant start and GFW-immune fallback.
 */
const localSegmenter = (word: string): string[] => {
  const w = word.toLowerCase();
  
  // 1. Phonics Units (Digraphs, Trigraphs, Vowel Teams)
  const units = [
    // Trigraphs
    'tch', 'dge', 'igh', 'eigh', 'ough', 'augh',
    // Digraphs
    'sh', 'ch', 'th', 'ph', 'wh', 'ck', 'ng', 'qu', 'kn', 'wr', 'gn', 'mb',
    // Vowel Teams
    'ai', 'ay', 'ee', 'ea', 'ie', 'oa', 'oe', 'ue', 'ui', 'oo', 'ou', 'ow', 'oi', 'oy', 'au', 'aw', 'ey',
    // R-controlled
    'ar', 'er', 'ir', 'or', 'ur', 'air', 'ear', 'eer', 'oar', 'oor',
    // Common Suffixes (Morphological segments)
    'tion', 'sion', 'ture', 'able', 'ible', 'ment', 'ness', 'less', 'full', 'ship', 'hood', 'ight'
  ];

  let segments: string[] = [];
  let i = 0;
  
  while (i < w.length) {
    let matched = false;
    
    // Check for multi-letter units (longest first)
    for (const unit of units.sort((a, b) => b.length - a.length)) {
      if (w.startsWith(unit, i)) {
        segments.push(word.substr(i, unit.length));
        i += unit.length;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      segments.push(word[i]);
      i++;
    }
  }

  // Post-processing: Merge Consonant + Vowel (CV)
  const finalSegments: string[] = [];
  for (let j = 0; j < segments.length; j++) {
    const current = segments[j];
    const next = segments[j+1];
    
    const isVowel = (s: string) => s.length === 1 && 'aeiouy'.includes(s.toLowerCase());
    const isConsonant = (s: string) => s.length === 1 && !'aeiouy'.includes(s.toLowerCase());

    if (isConsonant(current) && next && isVowel(next)) {
      finalSegments.push(current + next);
      j++;
    } else {
      finalSegments.push(current);
    }
  }
  
  return finalSegments;
};

export const getWordSegments = async (words: string[]): Promise<Record<string, string[]>> => {
  const cachedStr = localStorage.getItem(SEGMENTS_CACHE_KEY);
  const cache: Record<string, string[]> = cachedStr ? JSON.parse(cachedStr) : {};
  
  const results: Record<string, string[]> = {};
  const missingWords: string[] = [];

  for (const word of words) {
    if (cache[word]) {
      results[word] = cache[word];
    } else {
      // Use local engine for missing words to ensure INSTANT start
      results[word] = localSegmenter(word);
      missingWords.push(word);
    }
  }

  // If there are missing words, trigger AI enhancement in background
  if (missingWords.length > 0) {
    fetchAISegments(missingWords).then(aiResults => {
      if (Object.keys(aiResults).length > 0) {
        const updatedCache = { ...cache, ...aiResults };
        localStorage.setItem(SEGMENTS_CACHE_KEY, JSON.stringify(updatedCache));
      }
    }).catch(() => {
      // Silent fail for GFW/Offline
    });
  }

  // Return results immediately (either from cache or local engine)
  return results;
};

const fetchAISegments = async (words: string[]): Promise<Record<string, string[]>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Divide these words into "Teaching Syllables" for Phonics (G2 Standard). 
      Keep digraphs (sh, ch, th, etc.) together. Break short words into phonemes (c-a-t).
      Return JSON object.
      Words: ${words.join(', ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: words.reduce((acc, word) => {
            acc[word] = { type: Type.ARRAY, items: { type: Type.STRING } };
            return acc;
          }, {} as any)
        }
      }
    });

    if (!response.text) return {};
    const result = JSON.parse(response.text) as Record<string, string[]>;
    
    const validated: Record<string, string[]> = {};
    for (const word of words) {
      const segments = result[word];
      if (segments && segments.join('').toLowerCase() === word.toLowerCase()) {
        validated[word] = segments;
      }
    }
    return validated;
  } catch (error) {
    console.error("Background AI fetch failed:", error);
    return {};
  }
};

export const getAIFeedback = async (score: number): Promise<string> => {
  // Localized feedback library
  const feedbackMap: Record<string, string[]> = {
    high: [
      "Incredible! Your spelling is masterful.",
      "Perfect performance! You're a spelling champion.",
      "Outstanding! Your Lexile level is impressive.",
      "Bravo! You've mastered these words perfectly."
    ],
    mid: [
      "Great progress! Keep at it.",
      "Excellent work! You're nearly there.",
      "Solid effort! A few more practices and you'll be perfect.",
      "Well done! Your hard work is showing."
    ],
    low: [
      "Good effort! Let's practice some more.",
      "Keep trying! You'll get better every time.",
      "Don't give up! Every mistake is a learning step.",
      "Practice makes perfect. Let's try again!"
    ]
  };

  const category = score >= 85 ? 'high' : score >= 60 ? 'mid' : 'low';
  const options = feedbackMap[category];
  return options[Math.floor(Math.random() * options.length)];
};
