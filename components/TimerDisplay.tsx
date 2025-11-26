import React from 'react';
import { TimerMode } from '../types';

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeLeft,
  totalTime,
  mode,
  isActive,
  onToggle,
  onReset,
  onSkip
}) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modeColors = {
    work: 'stroke-promodo-accent',
    shortBreak: 'stroke-green-400',
    longBreak: 'stroke-purple-400'
  };

  const modeText = {
    work: 'Deep Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  };

  return (
    <div className="flex flex-col items-center justify-center relative p-8">
      {/* Circular Progress */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-promodo-card opacity-30"
          />
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-linear ${modeColors[mode]} drop-shadow-[0_0_15px_rgba(30,144,255,0.5)]`}
          />
        </svg>

        {/* Digital Time */}
        <div className="absolute flex flex-col items-center">
          <span className="text-6xl font-mono font-bold tracking-tighter text-white drop-shadow-lg">
            {formatTime(timeLeft)}
          </span>
          <span className="text-promodo-accent uppercase tracking-widest mt-2 font-medium">
            {modeText[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6 mt-8">
        <button
          onClick={onReset}
          className="p-4 rounded-full bg-promodo-card hover:bg-white/10 text-gray-300 transition-all hover:scale-105"
          title="Reset"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={onToggle}
          className="p-6 rounded-full bg-promodo-accent hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-110 active:scale-95"
          title={isActive ? "Pause" : "Start"}
        >
          {isActive ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>

        <button
          onClick={onSkip}
          className="p-4 rounded-full bg-promodo-card hover:bg-white/10 text-gray-300 transition-all hover:scale-105"
          title="Skip"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TimerDisplay;