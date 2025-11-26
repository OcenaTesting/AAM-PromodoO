
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, Task, SessionConfig, SessionLog, SoundType, User } from './types';
import TimerDisplay from './components/TimerDisplay';
import TaskBoard from './components/TaskBoard';
import SpotifyPanel from './components/SpotifyPanel';
import Analytics from './components/Analytics';
import SettingsPanel from './components/SettingsPanel';
import AuthPage from './components/AuthPage';
import { audioService } from './services/audioService';
import { suggestDailyPlan } from './services/geminiService';
import { storageService } from './services/storageService';
import { spotifyService } from './services/spotifyService';
import { authService } from './services/authService';

const App: React.FC = () => {
  // -- State --
  const [activeTab, setActiveTab] = useState<'timer' | 'analytics' | 'settings'>('timer');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<TimerMode>('work');
  const [isActive, setIsActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [showPlan, setShowPlan] = useState<string | null>(null);
  const [dailyPlanLoading, setDailyPlanLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  
  // -- Auth & Sync State --
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // -- Configuration --
  const [config, setConfig] = useState<SessionConfig>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: true,
    autoStartWork: false
  });

  const timerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  // -- Initialization --
  useEffect(() => {
    // 1. Check URL Hash for new login callback
    const { token, expiresIn } = spotifyService.parseUrlHash();
    
    if (token && expiresIn) {
      console.log("Found Spotify token in URL, saving...");
      spotifyService.saveToken(token, expiresIn);
      setSpotifyToken(token);
      // Clean URL hash so we don't re-process it or look messy
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      // 2. Check Local Storage for existing session
      const storedToken = spotifyService.getStoredToken();
      if (storedToken) {
        console.log("Restored Spotify session from storage");
        setSpotifyToken(storedToken);
      }
    }

    const initData = async () => {
      try {
        const [storedTasks, storedConfig, storedHistory, currentStreak] = await Promise.all([
          storageService.loadTasks(),
          storageService.loadConfig(),
          storageService.getHistory(),
          storageService.updateStreak()
        ]);

        if (storedTasks) setTasks(storedTasks);
        if (storedHistory) setHistory(storedHistory);
        if (currentStreak) setStreak(currentStreak);
        
        if (storedConfig) {
          setConfig(storedConfig);
          // Only update timer if we are in default state (work) and not active
          if (!isActive) {
             setTimeLeft(storedConfig.workDuration * 60);
          }
        }

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load database:", error);
        setIsDataLoaded(true); 
      }
    };

    initData();
  }, []);

  // Save tasks whenever they change, ONLY after initial load
  useEffect(() => {
    if (isDataLoaded) {
      storageService.saveTasks(tasks);
    }
  }, [tasks, isDataLoaded]);

  // -- Auth Handlers --

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuth(false);
    
    // Sync logic: Fetch cloud data and merge/restore
    setIsSyncing(true);
    try {
      const cloudData = await authService.restoreData(loggedInUser.id);
      
      if (cloudData) {
        // We found backup data!
        // Strategy: Cloud wins if it exists. 
        // In a real app we might ask "Keep Local or Restore Cloud?"
        // Here we restore for "Backup" functionality proof.
        
        console.log("Restoring from cloud...", cloudData);
        setTasks(cloudData.tasks);
        setHistory(cloudData.history);
        setConfig(cloudData.config);
        
        // Update local DB
        await Promise.all([
          storageService.saveTasks(cloudData.tasks),
          storageService.saveConfig(cloudData.config),
          storageService.overwriteHistory(cloudData.history)
        ]);
        
      } else {
        // No cloud data (New User?), Back up current local data
        console.log("New user, backing up local data...");
        await authService.backupData(loggedInUser.id, tasks, history, config);
      }
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Push current state to cloud
      await authService.backupData(user.id, tasks, history, config);
      // alert("Backup successful!"); // Optional: notification
    } catch (e) {
      console.error("Backup failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    // Optional: Clear local data? For now we keep it (Local First philosophy)
  };

  const handleSaveConfig = async (newConfig: SessionConfig) => {
    setConfig(newConfig);
    await storageService.saveConfig(newConfig);
    
    // Reset timer if idle to reflect new durations
    if (!isActive) {
      if (timerMode === 'work') setTimeLeft(newConfig.workDuration * 60);
      else if (timerMode === 'shortBreak') setTimeLeft(newConfig.shortBreakDuration * 60);
      else setTimeLeft(newConfig.longBreakDuration * 60);
    }
  };

  // -- Timer Logic --
  const getTotalTime = useCallback(() => {
    switch (timerMode) {
      case 'work': return config.workDuration * 60;
      case 'shortBreak': return config.shortBreakDuration * 60;
      case 'longBreak': return config.longBreakDuration * 60;
    }
  }, [timerMode, config]);

  const switchMode = useCallback((mode: TimerMode) => {
    setTimerMode(mode);
    setIsActive(false);
    
    let duration = 0;
    if (mode === 'work') duration = config.workDuration * 60;
    else if (mode === 'shortBreak') duration = config.shortBreakDuration * 60;
    else duration = config.longBreakDuration * 60;

    setTimeLeft(duration);
    sessionStartRef.current = Date.now();
    
    // Update Theme/Favicon
    document.title = `${mode === 'work' ? 'Focus' : 'Break'} - Aam Pomodoro`;
  }, [config]);

  const handleTimerComplete = useCallback(async () => {
    setIsActive(false);
    audioService.playSound(SoundType.END);

    // Save Session Data
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000 / 60);
    const newSession: SessionLog = {
      id: crypto.randomUUID(),
      startTime: sessionStartRef.current,
      endTime: Date.now(),
      durationMinutes: config.workDuration, // Store nominal duration for consistency
      mode: timerMode,
      completed: true,
      tasksCompletedIds: [] // Can link currently active task here
    };

    if (timerMode === 'work') {
      await storageService.saveSession(newSession);
      const newHistory = [...history, newSession];
      setHistory(newHistory);
      
      // Auto-Sync if logged in (Silent Backup)
      if (user) {
        authService.backupData(user.id, tasks, newHistory, config).catch(console.error);
      }
    }
    
    // Auto-switch logic
    if (timerMode === 'work') {
      // Calculate sessions today for auto long-break logic
      const workSessionsToday = history.filter(h => 
        h.mode === 'work' && 
        new Date(h.startTime).toDateString() === new Date().toDateString()
      ).length + 1;

      const nextMode = (workSessionsToday % 4 === 0) ? 'longBreak' : 'shortBreak';
      switchMode(nextMode);
      if (config.autoStartBreaks) setIsActive(true);
    } else {
      switchMode('work');
      if (config.autoStartWork) setIsActive(true);
    }
  }, [timerMode, config, switchMode, history, tasks, user]);

  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastTimeRef.current) / 1000);
        
        if (delta >= 1) {
          setTimeLeft(prev => {
            const newVal = prev - delta;
            if (newVal <= 0) {
              handleTimerComplete();
              return 0;
            }
            return newVal;
          });
          lastTimeRef.current = now;
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, handleTimerComplete]);

  // -- Handlers --
  const toggleTimer = () => {
    if (!isActive) {
      audioService.playSound(SoundType.START);
      lastTimeRef.current = Date.now();
      // If starting fresh
      if (timeLeft === getTotalTime()) {
        sessionStartRef.current = Date.now();
      }
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getTotalTime());
  };

  const skipTimer = () => {
    // Skipping doesn't count as a complete session
    setIsActive(false);
    handleTimerComplete(); // Reuse logic for switching
  };

  const generateDailyPlan = async () => {
    setDailyPlanLoading(true);
    const recentFocusScore = calculateFocusScore(history);
    const plan = await suggestDailyPlan(tasks, recentFocusScore);
    setShowPlan(plan);
    setDailyPlanLoading(false);
  };

  const calculateFocusScore = (history: SessionLog[]) => {
    if (history.length === 0) return 0;
    const workMinutes = history.filter(h => h.mode === 'work').reduce((acc, curr) => acc + curr.durationMinutes, 0);
    // Score based on accumulated minutes today and tasks
    // Reset score to 0 and calculate fresh for display
    const score = Math.min(100, Math.floor(workMinutes / 2)); 
    return score;
  };

  const focusScore = calculateFocusScore(history);

  // -- Keyboard Shortcuts --
  // Use a ref to hold the latest version of handlers so the effect doesn't need to re-bind constantly
  const handlersRef = useRef({ toggleTimer, resetTimer, skipTimer, switchMode });
  useEffect(() => {
    handlersRef.current = { toggleTimer, resetTimer, skipTimer, switchMode };
  }, [toggleTimer, resetTimer, skipTimer, switchMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea/select
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault(); // Prevent scrolling
          handlersRef.current.toggleTimer();
          break;
        case 'KeyR':
          if (!e.metaKey && !e.ctrlKey) handlersRef.current.resetTimer();
          break;
        case 'KeyS':
          if (!e.metaKey && !e.ctrlKey) handlersRef.current.skipTimer();
          break;
        case 'Digit1':
        case 'Numpad1':
          handlersRef.current.switchMode('work');
          break;
        case 'Digit2':
        case 'Numpad2':
          handlersRef.current.switchMode('shortBreak');
          break;
        case 'Digit3':
        case 'Numpad3':
          handlersRef.current.switchMode('longBreak');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -- Render --
  return (
    <div className="min-h-screen bg-promodo-bg text-promodo-text flex flex-col md:flex-row overflow-hidden font-sans selection:bg-promodo-accent selection:text-white">
      
      {showAuth && (
        <AuthPage 
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowAuth(false)}
        />
      )}

      {/* Sidebar / Navigation */}
      <nav className="w-full md:w-20 lg:w-64 flex-shrink-0 bg-promodo-card/30 border-r border-white/5 flex flex-col items-center py-6 gap-8 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 w-full justify-center lg:justify-start">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-xl transform hover:rotate-12 transition-transform duration-300">
            A
          </div>
          <span className="block md:hidden lg:block font-bold text-xl tracking-tight text-white">Aam Pomodoro</span>
        </div>

        <div className="flex-1 w-full px-2 space-y-2">
          {['Timer', 'Analytics', 'Settings'].map((item) => {
            const key = item.toLowerCase() as 'timer' | 'analytics' | 'settings';
            const isActiveTab = activeTab === key;
            return (
              <button 
                key={item} 
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${isActiveTab ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'}`}
              >
                <span className={`text-xl transition-all ${isActiveTab ? 'opacity-100 scale-110' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`}>
                  {key === 'timer' && '⏱️'}
                  {key === 'analytics' && '📊'}
                  {key === 'settings' && '⚙️'}
                </span>
                <span className="hidden lg:block font-medium">{item}</span>
              </button>
            );
          })}
        </div>

        <div className="w-full px-4 mb-4 space-y-3">
          <button 
            onClick={generateDailyPlan}
            disabled={dailyPlanLoading}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10"
          >
            {dailyPlanLoading ? (
              <span className="animate-pulse">Thinking...</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="hidden lg:inline">AI Daily Plan</span>
              </>
            )}
          </button>
          
          {!user && (
            <button 
              onClick={() => setShowAuth(true)}
              className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              <span className="hidden lg:inline">Sign In / Sync</span>
            </button>
          )}

          {user && (
            <div className="hidden lg:flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs border border-purple-500/50">
                {user.name.charAt(0)}
              </div>
              <div className="text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
                {user.name}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Header */}
        <header className="px-8 py-6 flex justify-between items-center z-10 shrink-0">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {activeTab === 'timer' && 'Deep Focus Zone'}
              {activeTab === 'analytics' && 'Productivity Analytics'}
              {activeTab === 'settings' && 'System Preferences'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                🔥 {streak} Day Streak
              </span>
              <p className="text-gray-400 text-sm hidden md:block">
                 {activeTab === 'timer' ? "One task at a time." : activeTab === 'analytics' ? "Measure what matters." : "Customize your workflow."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold tracking-widest text-promodo-accent uppercase mb-0.5">Focus Score</span>
              <span className={`text-2xl font-mono font-bold ${focusScore >= 80 ? 'text-green-400' : focusScore >= 50 ? 'text-blue-400' : 'text-yellow-400'}`}>
                {focusScore}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-white/10 shadow-lg"></div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 z-10 pb-20 relative">
          
          {/* AI Plan Banner */}
          {showPlan && (
            <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 p-5 rounded-xl border border-indigo-500/30 flex items-start gap-4 relative animate-fade-in shadow-lg mb-8">
              <span className="text-2xl mt-1">💡</span>
              <div className="flex-1">
                <h4 className="font-bold text-indigo-200 text-sm mb-2 uppercase tracking-wide">AI Daily Strategy</h4>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line font-medium opacity-90">{showPlan}</p>
              </div>
              <button 
                onClick={() => setShowPlan(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {!isDataLoaded ? (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-promodo-accent"></div>
             </div>
          ) : (
            <>
              {/* TIMER TAB - We use hidden class to keep state alive for Spotify */}
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 h-full ${activeTab !== 'timer' ? 'hidden' : ''}`}>
                {/* Left Column: Timer & Controls */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-promodo-card/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl flex-1 flex flex-col justify-center min-h-[400px] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <TimerDisplay 
                      timeLeft={timeLeft}
                      totalTime={getTotalTime()}
                      mode={timerMode}
                      isActive={isActive}
                      onToggle={toggleTimer}
                      onReset={resetTimer}
                      onSkip={skipTimer}
                    />
                  </div>
                  {/* Spotify Panel remains mounted to keep music playing */}
                  <SpotifyPanel 
                    config={config}
                    onUpdateConfig={handleSaveConfig}
                    onPlayAmbient={(type) => audioService.playAmbient(type)}
                    onStopAmbient={() => audioService.stopAmbient()}
                    timerActive={isActive}
                    timerMode={timerMode}
                    accessToken={spotifyToken}
                  />
                </div>
                {/* Right Column: Tasks */}
                <div className="lg:col-span-7 flex flex-col h-full overflow-hidden min-h-[500px]">
                  <TaskBoard tasks={tasks} setTasks={setTasks} />
                </div>
              </div>

              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && (
                <div className="h-full">
                  <Analytics history={history} tasks={tasks} />
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="h-full">
                  <SettingsPanel 
                    config={config} 
                    onSave={handleSaveConfig} 
                    user={user}
                    onLoginRequest={() => setShowAuth(true)}
                    onLogout={handleLogout}
                    onSyncRequest={handleSync}
                    isSyncing={isSyncing}
                  />
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
