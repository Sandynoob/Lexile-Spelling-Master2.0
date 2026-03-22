
import React, { useState, useEffect } from 'react';
import { GameState, LexileRange, Word, ScoreData, TestRecord, WordResult } from './types';
import { LEXILE_WORDS } from './constants';
import LexileSelector from './components/LexileSelector';
import SpellingGame from './components/SpellingGame';
import Results from './components/Results';
import History from './components/History';
import Settings from './components/Settings';
import { getWordSegments } from './services/phonicsService';

const HISTORY_KEY = 'lexile_test_history_v2';
const MAX_HISTORY_SESSIONS = 10;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<TestRecord[]>([]);
  const [currentRange, setCurrentRange] = useState<LexileRange>(LexileRange.BR_200L);

  useEffect(() => {
    const handleGoToHistory = () => setGameState(GameState.HISTORY);
    window.addEventListener('go-to-history', handleGoToHistory);
    return () => window.removeEventListener('go-to-history', handleGoToHistory);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistoryRecords(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (record: TestRecord) => {
    const newHistory = [record, ...historyRecords].slice(0, MAX_HISTORY_SESSIONS);
    setHistoryRecords(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const startTest = async (range: LexileRange, count: number) => {
    setIsLoading(true);
    setCurrentRange(range);
    
    // 1. Get the raw pool and ensure it's unique by word (case-insensitive)
    const rawPool = LEXILE_WORDS[range];
    const uniquePoolMap = new Map<string, Word>();
    rawPool.forEach(w => {
      const key = w.word.toLowerCase();
      if (!uniquePoolMap.has(key)) {
        uniquePoolMap.set(key, w);
      }
    });
    const pool = Array.from(uniquePoolMap.values());

    // 2. Map word to its most recent test index (0 = most recent, higher = older)
    // We'll use this to prioritize words that haven't been seen in a long time
    const lastSeenIndex = new Map<string, number>();
    historyRecords.forEach((record, sessionIdx) => {
      record.results.forEach(res => {
        const wordKey = res.word.toLowerCase();
        if (!lastSeenIndex.has(wordKey)) {
          lastSeenIndex.set(wordKey, sessionIdx);
        }
      });
    });

    // 3. Categorize words
    const neverTested = pool.filter(w => !lastSeenIndex.has(w.word.toLowerCase()));
    const previouslyTested = pool.filter(w => lastSeenIndex.has(w.word.toLowerCase()))
      .sort((a, b) => {
        const idxA = lastSeenIndex.get(a.word.toLowerCase()) || 0;
        const idxB = lastSeenIndex.get(b.word.toLowerCase()) || 0;
        // Sort by session index descending (higher index = older session)
        return idxB - idxA;
      });

    // 4. Build the selection pool
    // Priority: Never tested > Tested longest ago
    // Optimization: If we have enough words, exclude words from the last 3 sessions
    let selectionPool = [...neverTested, ...previouslyTested];
    
    if (historyRecords.length > 0 && selectionPool.length > count * 3) {
      const recentSessionsCount = Math.min(3, historyRecords.length);
      const recentWords = new Set<string>();
      for (let i = 0; i < recentSessionsCount; i++) {
        historyRecords[i].results.forEach(r => recentWords.add(r.word.toLowerCase()));
      }
      
      const filteredPool = selectionPool.filter(w => !recentWords.has(w.word.toLowerCase()));
      // Only use filtered pool if it still has enough words to provide variety
      if (filteredPool.length >= count) {
        selectionPool = filteredPool;
      }
    }

    // 5. Shuffle the top candidates to avoid predictable patterns
    // We take a slightly larger slice than needed and shuffle it
    const candidateSize = Math.min(count * 3, selectionPool.length);
    const candidates = selectionPool.slice(0, candidateSize);
    const selected = candidates.sort(() => 0.5 - Math.random()).slice(0, count);
    
    try {
      const segmentsMap = await getWordSegments(selected.map(w => w.word));
      const wordsWithSegments = selected.map(w => ({
        ...w,
        segments: segmentsMap[w.word] || w.word.split('')
      }));
      
      setCurrentWords(wordsWithSegments);
      setGameState(GameState.PLAYING);
    } catch (error) {
      console.error("Failed to prepare words:", error);
      setCurrentWords(selected.map(w => ({ ...w, segments: w.word.split('') })));
      setGameState(GameState.PLAYING);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = (data: ScoreData, results: WordResult[]) => {
    const record: TestRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      range: currentRange,
      score: data.totalScore,
      correctCount: data.correctFirstTry,
      totalWords: data.totalWords,
      results: results
    };
    saveToHistory(record);
    setScoreData(data);
    setGameState(GameState.FINISHED);
  };

  const resetGame = () => {
    setGameState(GameState.START);
    setScoreData(null);
    setCurrentWords([]);
  };

  const isNavVisible = gameState !== GameState.PLAYING;

  return (
    <div className="min-h-[100dvh] h-[100dvh] flex flex-col p-4 md:p-6 selection:bg-indigo-100 transition-colors overflow-hidden relative bg-slate-50">
      
      {/* Header - Dynamically scales. Hidden/Reduced to maximize game area */}
      <header className={`flex-none w-full mx-auto transition-all duration-500 ease-in-out flex flex-col items-center justify-center z-20 
        ${gameState === GameState.PLAYING ? 'h-[8vh] mb-2' : 'h-[15vh] md:h-[20vh] mb-4'}`}>
        
        <div 
          className="flex flex-col items-center cursor-pointer group" 
          onClick={() => gameState !== GameState.PLAYING && resetGame()}
        >
          {/* Logo Badge - Adaptive sizing based on state and viewport */}
          <div className={`bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:rotate-6 transition-all duration-300
            ${gameState === GameState.PLAYING ? 'w-8 h-8 md:w-10 md:h-10 mb-1' : 'w-12 h-12 md:w-16 md:h-16 mb-2'}`}>
            <span className={`text-white font-kids leading-none transition-all
              ${gameState === GameState.PLAYING ? 'text-lg md:text-xl' : 'text-2xl md:text-4xl'}`}>
              L
            </span>
          </div>
          
          <div className="text-center">
            <h1 className={`font-kids text-indigo-900 leading-tight transition-all
              ${gameState === GameState.PLAYING ? 'text-sm md:text-lg' : 'text-xl md:text-3xl'}`}>
              Lexile Master
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area - Strictly constrained to remaining space */}
      <main className="flex-1 w-full max-w-5xl mx-auto relative z-10 overflow-hidden flex flex-col bg-white/40 rounded-[2rem] shadow-inner border border-white/50 mb-4">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-900 font-kids text-xl animate-pulse">Generating Phonetic Segments...</p>
          </div>
        )}
        {gameState === GameState.START && (
          <div className="flex-1 overflow-y-auto no-scrollbar py-4">
            <LexileSelector onSelect={startTest} />
          </div>
        )}

        {gameState === GameState.HISTORY && (
          <div className="flex-1 overflow-y-auto no-scrollbar py-4">
            <History 
              records={historyRecords} 
              onBack={resetGame} 
            />
          </div>
        )}

        {gameState === GameState.SETTINGS && (
          <div className="flex-1 overflow-y-auto no-scrollbar py-4">
            <Settings />
          </div>
        )}

        {gameState === GameState.PLAYING && currentWords.length > 0 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-2 md:p-4">
            <SpellingGame 
              words={currentWords} 
              onFinish={handleFinish} 
              onBack={resetGame}
            />
          </div>
        )}

        {gameState === GameState.FINISHED && scoreData && (
          <div className="flex-1 overflow-y-auto no-scrollbar py-4">
            <Results 
              scoreData={scoreData} 
              onRestart={resetGame} 
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      {isNavVisible && (
        <nav className="flex-none h-[10vh] max-w-md mx-auto w-full bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-50 flex items-center justify-around px-4 mb-2 animate-pop">
          <button 
            onClick={() => setGameState(GameState.START)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${gameState === GameState.START || gameState === GameState.FINISHED ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <div className={`p-2 rounded-xl ${gameState === GameState.START || gameState === GameState.FINISHED ? 'bg-indigo-50' : ''}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
          </button>

          <button 
            onClick={() => setGameState(GameState.HISTORY)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${gameState === GameState.HISTORY ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <div className={`p-2 rounded-xl ${gameState === GameState.HISTORY ? 'bg-indigo-50' : ''}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">History</span>
          </button>

          <button 
            onClick={() => setGameState(GameState.SETTINGS)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${gameState === GameState.SETTINGS ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <div className={`p-2 rounded-xl ${gameState === GameState.SETTINGS ? 'bg-indigo-50' : ''}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
          </button>
        </nav>
      )}

      {/* Footer - Minimalized to prevent push-out */}
      {!isNavVisible && (
        <footer className="flex-none h-[4vh] text-center z-20 flex items-center justify-center opacity-30 mt-2">
          <p className="text-[8px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Safe & Secure Assessment Environment
          </p>
        </footer>
      )}

      {/* Background Decor */}
      <div className="fixed -bottom-20 -left-20 w-48 h-48 bg-indigo-100/30 rounded-full blur-3xl -z-0 pointer-events-none"></div>
      <div className="fixed -top-20 -right-20 w-48 h-48 bg-blue-100/30 rounded-full blur-3xl -z-0 pointer-events-none"></div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
