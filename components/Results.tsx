
import React, { useEffect, useState } from 'react';
import { ScoreData } from '../types';
import { getAIFeedback } from '../services/phonicsService';

interface ResultsProps { scoreData: ScoreData; onRestart: () => void; }

const Results: React.FC<ResultsProps> = ({ scoreData, onRestart }) => {
  const [aiFeedback, setAiFeedback] = useState("Analyzing results...");
  const { totalScore, correctFirstTry, totalWords } = scoreData;

  useEffect(() => {
    getAIFeedback(totalScore).then(setAiFeedback);
  }, [totalScore]);

  const rank = totalScore >= 90 ? { title: 'Legendary', color: 'text-red-500', bg: 'bg-red-50' }
             : totalScore >= 80 ? { title: 'Excellent', color: 'text-orange-500', bg: 'bg-orange-50' }
             : totalScore >= 60 ? { title: 'Proficient', color: 'text-blue-500', bg: 'bg-blue-50' }
             : totalScore >= 40 ? { title: 'Developing', color: 'text-green-500', bg: 'bg-green-50' }
             : { title: 'Beginner', color: 'text-slate-500', bg: 'bg-slate-50' };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
      <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center shadow-inner border-4 border-white ${rank.bg} mb-4`}>
        <span className={`text-3xl md:text-5xl font-kids ${rank.color}`}>{totalScore}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Score</span>
      </div>

      <h2 className={`text-2xl md:text-4xl font-kids mb-2 ${rank.color}`}>{rank.title}</h2>
      
      <div className="bg-white/60 backdrop-blur rounded-[2rem] p-6 shadow-sm border border-white w-full max-w-sm mb-6">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-white/40 rounded-2xl border border-white">
            <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Words</p>
            <p className="text-xl font-kids text-slate-700">{totalWords}</p>
          </div>
          <div className="p-3 bg-white/40 rounded-2xl border border-white">
            <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Perfect</p>
            <p className="text-xl font-kids text-indigo-500">{correctFirstTry}</p>
          </div>
        </div>
        <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed italic">
          "{aiFeedback}"
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Restart Challenge</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('go-to-history'))}
          className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-50 rounded-2xl font-bold hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>View History</span>
        </button>
      </div>
    </div>
  );
};

export default Results;
