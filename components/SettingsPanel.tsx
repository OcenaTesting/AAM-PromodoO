
import React, { useState, useEffect } from 'react';
import { SessionConfig, User } from '../types';

interface SettingsPanelProps {
  config: SessionConfig;
  onSave: (newConfig: SessionConfig) => void;
  user: User | null;
  onLoginRequest: () => void;
  onLogout: () => void;
  onSyncRequest: () => void;
  isSyncing: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  config, 
  onSave, 
  user, 
  onLoginRequest, 
  onLogout,
  onSyncRequest,
  isSyncing
}) => {
  const [localConfig, setLocalConfig] = useState<SessionConfig>(config);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Generic handler for numbers/booleans/strings
  const handleChange = (key: keyof SessionConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    onSave(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyRedirectUri = () => {
    const uri = window.location.origin;
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto bg-promodo-card/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl animate-fade-in pb-20">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
        <span className="text-3xl">⚙️</span> Settings
      </h2>

      <div className="space-y-8">
        
        {/* Account Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-purple-400 uppercase tracking-wider text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Account & Data
          </h3>
          <div className="bg-white/5 p-6 rounded-xl border border-white/5 flex items-center justify-between">
            {user ? (
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                     {user.name.charAt(0)}
                   </div>
                   <div>
                     <h4 className="font-bold text-white">{user.name}</h4>
                     <p className="text-xs text-gray-400">{user.email}</p>
                   </div>
                 </div>
                 <div className="flex gap-3 mt-4">
                   <button 
                      onClick={onSyncRequest}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-500/30 flex items-center gap-2"
                   >
                     {isSyncing ? (
                       <span className="animate-spin">⏳</span> 
                     ) : (
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     )}
                     {isSyncing ? 'Backing up...' : 'Sync Now'}
                   </button>
                   <button 
                      onClick={onLogout}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-500/30"
                   >
                     Sign Out
                   </button>
                 </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                   <h4 className="font-bold text-white">Guest User</h4>
                   <p className="text-xs text-gray-400 mt-1">Sign in to backup your progress to the cloud.</p>
                </div>
                <button 
                   onClick={onLoginRequest}
                   className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                   Sign In
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full h-px bg-white/5"></div>
        
        {/* Timer Durations */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-promodo-accent uppercase tracking-wider text-sm">Timer Durations (minutes)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Focus Session</label>
              <input 
                type="number" 
                value={localConfig.workDuration}
                onChange={(e) => handleChange('workDuration', parseInt(e.target.value) || 25)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-promodo-accent focus:ring-1 focus:ring-promodo-accent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Short Break</label>
              <input 
                type="number" 
                value={localConfig.shortBreakDuration}
                onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value) || 5)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-promodo-accent focus:ring-1 focus:ring-promodo-accent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Long Break</label>
              <input 
                type="number" 
                value={localConfig.longBreakDuration}
                onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value) || 15)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-promodo-accent focus:ring-1 focus:ring-promodo-accent outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-white/5"></div>

        {/* Automation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-promodo-accent uppercase tracking-wider text-sm">Automation</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
              <span className="text-gray-200">Auto-start Breaks</span>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${localConfig.autoStartBreaks ? 'bg-promodo-accent' : 'bg-gray-700'}`} onClick={() => handleChange('autoStartBreaks', !localConfig.autoStartBreaks)}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${localConfig.autoStartBreaks ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
              <span className="text-gray-200">Auto-start Focus Sessions</span>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${localConfig.autoStartWork ? 'bg-promodo-accent' : 'bg-gray-700'}`} onClick={() => handleChange('autoStartWork', !localConfig.autoStartWork)}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${localConfig.autoStartWork ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </div>
        </div>

        <div className="w-full h-px bg-white/5"></div>

        {/* Spotify Integration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#1DB954] uppercase tracking-wider text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Spotify Integration
          </h3>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5">
            <label className="block text-sm text-gray-300 mb-2">Spotify Client ID</label>
            <input 
              type="text" 
              value={localConfig.spotifyClientId || ''}
              onChange={(e) => handleChange('spotifyClientId', e.target.value)}
              placeholder="Enter your Client ID"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] outline-none transition-all font-mono text-sm"
            />
            <div className="mt-3 text-xs text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
              <p className="font-bold text-gray-300 mb-2">Setup Instructions (Local & Netlify):</p>
              <ol className="list-decimal pl-4 space-y-2">
                <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" className="text-[#1DB954] hover:underline">Spotify Developer Dashboard</a> and create an App.</li>
                <li>
                  <div className="flex flex-col gap-1">
                    <span>Add this <strong>Redirect URI</strong> for your current test environment:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-black/50 px-2 py-1 rounded text-green-400 font-mono break-all border border-green-500/20">{window.location.origin}</code>
                      <button 
                        onClick={copyRedirectUri}
                        className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <span className="text-green-400 font-bold px-1">✓</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
                <li>
                   <span className="text-blue-300">Deployment Tip:</span> Later, when you deploy to Netlify, just add your Netlify URL (e.g. <code>https://your-site.netlify.app</code>) as a <strong>second</strong> Redirect URI in Spotify.
                </li>
                <li>Copy the <strong>Client ID</strong> from Spotify and paste it above.</li>
                <li>Save these settings and then click "Connect Account" on the main timer page.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSave}
            className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2 ${saved ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-promodo-accent hover:bg-blue-400 text-white'}`}
          >
            {saved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Saved
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;
