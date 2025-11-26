
import React, { useState, useEffect, useRef } from 'react';
import { SpotifyState, SessionConfig, SpotifyPlaylist, TimerMode } from '../types';
import { spotifyService } from '../services/spotifyService';

interface SpotifyPanelProps {
  config: SessionConfig;
  onUpdateConfig: (newConfig: SessionConfig) => void;
  onPlayAmbient: (type: 'rain' | 'cafe' | 'white') => void;
  onStopAmbient: () => void;
  timerActive: boolean;
  timerMode: TimerMode;
  accessToken: string | null;
}

const SpotifyPanel: React.FC<SpotifyPanelProps> = ({ 
  config, 
  onUpdateConfig,
  onPlayAmbient, 
  onStopAmbient,
  timerActive,
  timerMode,
  accessToken
}) => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'ambient'>('ambient');
  const [currentAmbient, setCurrentAmbient] = useState<string | null>(null);
  
  // Spotify State
  const [spotifyState, setSpotifyState] = useState<SpotifyState>('disconnected');
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const progressInterval = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialize Spotify Player
  useEffect(() => {
    if (!accessToken) {
      setSpotifyState('disconnected');
      return;
    }

    setSpotifyState('connected');
    
    // Fetch Playlists
    spotifyService.getUserPlaylists().then(data => {
      if (isMounted.current) setPlaylists(data);
    });

    const initializePlayer = () => {
      if (!isMounted.current) return;

      const playerInstance = new (window as any).Spotify.Player({
        name: 'Aam Pomodoro Focus Player',
        getOAuthToken: (cb: any) => { cb(accessToken); },
        volume: 0.5
      });

      playerInstance.addListener('ready', ({ device_id }: any) => {
        console.log('Ready with Device ID', device_id);
        if (isMounted.current) {
          setDeviceId(device_id);
          setSpotifyState('ready');
        }
      });

      playerInstance.addListener('not_ready', ({ device_id }: any) => {
        console.log('Device ID has gone offline', device_id);
        if (isMounted.current) setSpotifyState('connected');
      });

      playerInstance.addListener('player_state_changed', (state: any) => {
        if (!state || !isMounted.current) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
        setDuration(state.duration);
        setProgress(state.position);
        setSpotifyState(state.paused ? 'ready' : 'playing');

        playerInstance.getVolume().then((vol: number) => {
          if (isMounted.current) setVolume(vol);
        });
      });

      playerInstance.addListener('initialization_error', ({ message }: any) => { console.error(message); if(isMounted.current) setErrorMsg("Failed to initialize player."); });
      playerInstance.addListener('authentication_error', ({ message }: any) => { console.error(message); if(isMounted.current) setErrorMsg("Auth failed. Reconnect."); });
      playerInstance.addListener('account_error', ({ message }: any) => { console.error(message); if(isMounted.current) setErrorMsg("Premium required for Web Player."); });

      playerInstance.connect();
      if (isMounted.current) setPlayer(playerInstance);
    };

    if ((window as any).Spotify) {
      initializePlayer();
    } else {
      (window as any).onSpotifyWebPlaybackSDKReady = initializePlayer;
      if (!document.getElementById('spotify-player-script')) {
        const script = document.createElement("script");
        script.id = 'spotify-player-script';
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
       if (player) {
         player.disconnect();
       }
    };
  }, [accessToken]);

  // Handle Progress Interval
  useEffect(() => {
    if (!isPaused && spotifyState === 'playing') {
      progressInterval.current = window.setInterval(() => {
        setProgress(prev => Math.min(prev + 1000, duration));
      }, 1000);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPaused, spotifyState, duration]);

  // Handle Timer Automation
  useEffect(() => {
    if (!deviceId) return;
    
    // Auto-pause when timer stops (optional preference logic)
    if (!timerActive && spotifyState === 'playing' && !isPaused) {
       spotifyService.pause(deviceId);
    }

    // Auto-play when timer starts
    if (timerActive) {
      const playMusic = async () => {
        let targetPlaylist = config.spotifyWorkPlaylistId;
        if (timerMode === 'shortBreak' || timerMode === 'longBreak') {
          targetPlaylist = config.spotifyBreakPlaylistId;
        }

        if (targetPlaylist) {
          await spotifyService.play(deviceId, targetPlaylist);
        }
      };
      playMusic();
    }
  }, [timerActive, timerMode, deviceId, config.spotifyWorkPlaylistId, config.spotifyBreakPlaylistId]);

  const handleLogin = () => {
    if (!config.spotifyClientId) {
      alert("Please enter a Client ID in Settings first.");
      return;
    }
    window.location.href = spotifyService.getAuthUrl(config.spotifyClientId);
  };

  const handleLogout = () => {
    spotifyService.logout();
    window.location.reload();
  };

  const handleAmbientClick = (type: 'rain' | 'cafe' | 'white') => {
    if (currentAmbient === type) {
      onStopAmbient();
      setCurrentAmbient(null);
    } else {
      onPlayAmbient(type);
      setCurrentAmbient(type);
    }
  };

  const togglePlayback = async () => {
    if (!player) return;

    // Smart Play: If we are 'ready' or paused but no track is loaded, try to play the selected playlist
    if ((isPaused && !currentTrack) || (spotifyState === 'ready' && !currentTrack)) {
        const playlistToPlay = config.spotifyWorkPlaylistId || playlists[0]?.uri;
        if (playlistToPlay && deviceId) {
            console.log("Cold start: Playing playlist", playlistToPlay);
            await spotifyService.play(deviceId, playlistToPlay);
            return;
        }
    }

    player.togglePlay();
  };

  const nextTrack = () => {
    if (player) player.nextTrack();
  };

  const prevTrack = () => {
    if (player) player.previousTrack();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPos = Number(e.target.value);
    setProgress(newPos);
    if (player) player.seek(newPos);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (player) player.setVolume(newVol);
  };

  const selectPlaylist = (type: 'work' | 'break', playlistUri: string) => {
     const newConfig = { ...config };
     if (type === 'work') newConfig.spotifyWorkPlaylistId = playlistUri;
     else newConfig.spotifyBreakPlaylistId = playlistUri;
     onUpdateConfig(newConfig);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / 1000) / 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-promodo-card/50 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full min-h-[400px] shadow-xl">
      {/* Tabs */}
      <div className="flex border-b border-white/5 shrink-0 bg-black/20">
        <button 
          onClick={() => setActiveTab('ambient')}
          className={`flex-1 py-3 text-sm font-bold tracking-wide transition-all ${activeTab === 'ambient' ? 'text-white border-b-2 border-promodo-accent' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Ambient
        </button>
        <button 
          onClick={() => setActiveTab('spotify')}
          className={`flex-1 py-3 text-sm font-bold tracking-wide transition-all ${activeTab === 'spotify' ? 'text-[#1DB954] border-b-2 border-[#1DB954]' : 'text-gray-500 hover:text-[#1DB954]'}`}
        >
          Spotify
        </button>
      </div>

      <div className="p-0 flex-1 overflow-y-auto custom-scrollbar relative">
        {activeTab === 'ambient' ? (
          <div className="p-6 grid grid-cols-2 gap-4">
            {[
              { id: 'rain', label: 'Heavy Rain', icon: '🌧️', color: 'from-blue-900 to-gray-900' },
              { id: 'cafe', label: 'Busy Café', icon: '☕', color: 'from-amber-900 to-orange-900' },
              { id: 'white', label: 'White Noise', icon: '🌊', color: 'from-gray-800 to-slate-900' }
            ].map(sound => (
              <button
                key={sound.id}
                onClick={() => handleAmbientClick(sound.id as any)}
                className={`relative overflow-hidden group p-4 rounded-2xl border transition-all h-32 flex flex-col items-center justify-center gap-2 ${
                  currentAmbient === sound.id 
                    ? 'border-promodo-accent ring-1 ring-promodo-accent shadow-lg shadow-blue-500/20' 
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${sound.color} opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                <span className="text-4xl transform group-hover:scale-110 transition-transform duration-300 relative z-10">{sound.icon}</span>
                <span className="text-sm font-medium text-gray-200 relative z-10">{sound.label}</span>
                {currentAmbient === sound.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full bg-gradient-to-b from-[#121212] to-black text-white">
            {spotifyState === 'disconnected' ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1DB954] flex items-center justify-center text-black mb-2 shadow-[0_0_20px_rgba(29,185,84,0.4)]">
                   <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Connect Spotify</h3>
                  <p className="text-sm text-gray-400">
                    {config.spotifyClientId 
                      ? "Control your focus music directly from Aam Pomodoro." 
                      : "Go to Settings > Spotify Integration to setup your Client ID."}
                  </p>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={!config.spotifyClientId}
                  className={`w-full py-3 bg-[#1DB954] text-black font-bold rounded-full transition-all transform hover:scale-[1.02] active:scale-95 ${!config.spotifyClientId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1ed760] shadow-lg shadow-green-900/50'}`}
                >
                  Connect Account
                </button>
                {errorMsg && <p className="text-xs text-red-400 mt-2 bg-red-900/20 px-2 py-1 rounded">{errorMsg}</p>}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Now Playing Area */}
                <div className="p-6 pb-2 flex-1 flex flex-col justify-end relative overflow-hidden group">
                  {/* Background Blur */}
                  {currentTrack?.album?.images?.[0]?.url && (
                    <div className="absolute inset-0 z-0">
                       <img src={currentTrack.album.images[0].url} className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent"></div>
                    </div>
                  )}

                  {/* Album Art & Info */}
                  <div className="relative z-10 flex items-end gap-5 mb-4">
                     <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg shadow-2xl overflow-hidden shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-500">
                       {currentTrack?.album?.images?.[0]?.url ? (
                         <img src={currentTrack.album.images[0].url} alt="Album Art" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full bg-gray-800 flex items-center justify-center text-4xl text-gray-600">
                            <span className="opacity-50">🎵</span>
                         </div>
                       )}
                     </div>
                     <div className="min-w-0 flex-1 pb-1">
                       <h4 className="font-bold text-white text-lg md:text-xl truncate leading-tight mb-1">
                          {currentTrack?.name || (deviceId ? "Ready to Play" : "Connecting...")}
                       </h4>
                       <p className="text-sm text-gray-400 truncate hover:text-white transition-colors cursor-default">
                          {currentTrack?.artists?.[0]?.name || (deviceId ? "Select a playlist below" : "Waiting for device...")}
                       </p>
                       <div className="flex justify-between items-center mt-2">
                         <p className="text-xs text-[#1DB954] font-medium tracking-wide uppercase">
                            {currentTrack?.album?.name || (deviceId ? "Device Active" : "")}
                         </p>
                         <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider hover:underline">
                           Disconnect
                         </button>
                       </div>
                     </div>
                  </div>
                </div>

                {/* Controls Area */}
                <div className="bg-[#121212] p-6 pt-2 z-10 space-y-4">
                   {/* Progress Bar */}
                   <div className="space-y-1 group/progress">
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={duration || 100} 
                        value={progress} 
                        onChange={handleSeek}
                        disabled={!currentTrack}
                        className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 group-hover/progress:[&::-webkit-slider-thumb]:opacity-100 transition-all hover:bg-gray-700 disabled:opacity-50"
                        style={{ backgroundSize: `${duration ? (progress/duration)*100 : 0}% 100%`, backgroundImage: 'linear-gradient(#1DB954, #1DB954)', backgroundRepeat: 'no-repeat' }}
                      />
                   </div>

                   {/* Main Controls */}
                   <div className="flex items-center justify-between">
                      {/* Volume */}
                      <div className="flex items-center gap-2 w-24 group/vol">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        <input 
                          type="range" 
                          min={0} 
                          max={1} 
                          step={0.01} 
                          value={volume}
                          onChange={handleVolume}
                          className="w-full h-1 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 group-hover/vol:[&::-webkit-slider-thumb]:opacity-100 transition-all"
                          style={{ backgroundSize: `${volume*100}% 100%`, backgroundImage: 'linear-gradient(#fff, #fff)', backgroundRepeat: 'no-repeat' }}
                        />
                      </div>

                      {/* Playback Buttons */}
                      <div className="flex items-center gap-6">
                         <button onClick={prevTrack} disabled={!currentTrack} className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
                         <button 
                           onClick={togglePlayback} 
                           className={`w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 ${!deviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                           {isPaused ? (
                             <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                           ) : (
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                           )}
                         </button>
                         <button onClick={nextTrack} disabled={!currentTrack} className="text-gray-400 hover:text-white transition-colors disabled:opacity-30"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
                      </div>

                      {/* Status Indicator */}
                      <div className="w-24 flex justify-end items-center gap-2">
                        {deviceId ? (
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider hidden md:block">Connected</span>
                        ) : (
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider hidden md:block">Connecting</span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${deviceId ? 'bg-green-500' : 'bg-red-500 animate-pulse'} shadow-[0_0_8px_currentColor]`} title={deviceId ? "Player Active" : "Connecting..."}></div>
                      </div>
                   </div>

                   {/* Playlist Selection */}
                   <div className="grid grid-cols-2 gap-3 pt-2">
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Focus Playlist</label>
                       <select 
                         className="w-full bg-[#282828] border border-transparent rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-[#1DB954] hover:bg-[#333] transition-colors"
                         value={config.spotifyWorkPlaylistId || ''}
                         onChange={(e) => selectPlaylist('work', e.target.value)}
                       >
                         <option value="">Select Focus Music...</option>
                         {playlists.map(p => (
                           <option key={p.id} value={p.uri}>{p.name}</option>
                         ))}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block">Break Playlist</label>
                       <select 
                         className="w-full bg-[#282828] border border-transparent rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-[#1DB954] hover:bg-[#333] transition-colors"
                         value={config.spotifyBreakPlaylistId || ''}
                         onChange={(e) => selectPlaylist('break', e.target.value)}
                       >
                         <option value="">Select Break Music...</option>
                         {playlists.map(p => (
                           <option key={p.id} value={p.uri}>{p.name}</option>
                         ))}
                       </select>
                     </div>
                   </div>
                   
                   {errorMsg && (
                     <div className="text-xs text-red-400 bg-red-900/10 border border-red-500/20 p-2 rounded text-center">
                       {errorMsg}
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyPanel;
