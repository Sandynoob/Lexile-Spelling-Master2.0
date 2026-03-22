
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="p-6 flex flex-col items-center animate-pop">
      <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
        <span className="text-white font-kids text-4xl">L</span>
      </div>
      
      <h2 className="font-kids text-2xl text-indigo-900 mb-2">Lexile Master</h2>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-8">Version 1.0.2</p>

      <div className="w-full space-y-4">
        <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
          <h3 className="font-kids text-indigo-900 mb-2">About the App</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Lexile Master is a professional spelling assessment tool designed for students. 
            It uses the Lexile framework to provide level-appropriate challenges and 
            leverages a local phonics engine for accurate phonetic segments.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
          <h3 className="font-kids text-indigo-900 mb-2">Key Features</h3>
          <ul className="text-slate-600 text-sm space-y-2 list-disc list-inside">
            <li>Lexile-based word levels</li>
            <li>Local phonetic segmentation</li>
            <li>American English pronunciation</li>
            <li>Detailed progress history</li>
            <li>Offline-first rule engine</li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-indigo-50 shadow-sm">
          <h3 className="font-kids text-indigo-900 mb-2">Technical Info</h3>
          <p className="text-slate-500 text-xs font-mono mb-2">
            Built with React 19, Tailwind CSS, and Capacitor. 
            Powered by a Local Phonics Engine (GFW-Immune).
          </p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>Local Architecture & GFW-Immune</span>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          © 2026 Lexile Master Team
        </p>
      </div>
    </div>
  );
};

export default Settings;
