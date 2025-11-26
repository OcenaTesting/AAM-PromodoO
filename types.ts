
export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
  createdAt: number;
  completedAt?: number;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface SessionConfig {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  // Spotify Config
  spotifyClientId?: string;
  spotifyWorkPlaylistId?: string;
  spotifyBreakPlaylistId?: string;
}

export interface SessionLog {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  mode: TimerMode;
  completed: boolean; // false if skipped/reset
  tasksCompletedIds: string[];
}

export interface AnalyticsData {
  dailyMinutes: { [date: string]: number };
  focusDistribution: { [category: string]: number };
  totalFocusMinutes: number;
  totalTasksCompleted: number;
  currentStreak: number;
}

export enum SoundType {
  START = 'start',
  BREAK = 'break',
  END = 'end',
  CLICK = 'click'
}

export type SpotifyState = 'disconnected' | 'connected' | 'ready' | 'playing' | 'paused';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  uri: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  images: { url: string }[];
  product: string; // 'premium' | 'free' | 'open'
}

// --- Auth Types ---

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CloudData {
  tasks: Task[];
  history: SessionLog[];
  config: SessionConfig;
  lastSynced: number;
}
