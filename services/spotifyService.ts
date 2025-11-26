
import { SpotifyPlaylist, SpotifyUserProfile } from '../types';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-modify-playback-state',
  'user-read-playback-state'
];

const TOKEN_KEY = 'promodo_spotify_token';
const EXPIRY_KEY = 'promodo_spotify_expiry';

class SpotifyService {
  private accessToken: string | null = null;
  
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  // --- Auth Flow ---

  getAuthUrl(clientId: string): string {
    const redirectUri = window.location.origin; // Redirect to current page
    console.log("[Spotify Auth] Using Redirect URI:", redirectUri);
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      show_dialog: 'true'
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  parseUrlHash(): { token: string | null, expiresIn: string | null } {
    const hash = window.location.hash;
    if (!hash) return { token: null, expiresIn: null };
    
    const params = new URLSearchParams(hash.substring(1));
    return {
        token: params.get('access_token'),
        expiresIn: params.get('expires_in')
    };
  }

  saveToken(token: string, expiresIn: string) {
    const expiryTime = Date.now() + (parseInt(expiresIn) * 1000);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    this.accessToken = token;
  }

  getStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if expired
    if (Date.now() > parseInt(expiry)) {
      this.logout();
      return null;
    }
    
    this.accessToken = token;
    return token;
  }
  
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    this.accessToken = null;
  }

  // --- API Calls ---

  async getUserProfile(): Promise<SpotifyUserProfile | null> {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (e) {
      console.error("Spotify Profile Error:", e);
      return null;
    }
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    if (!this.accessToken) return [];
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.error("Spotify Playlists Error:", e);
      return [];
    }
  }

  // --- Playback Control (API Fallback if SDK fails or for convenience) ---

  async play(deviceId: string, contextUri: string) {
    if (!this.accessToken) return;
    try {
      console.log(`[Spotify] Playing ${contextUri} on device ${deviceId}`);
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context_uri: contextUri })
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Spotify Play Error Payload:", err);
      }
    } catch (e) {
      console.error("Play error:", e);
    }
  }

  async pause(deviceId: string) {
    if (!this.accessToken) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
    } catch (e) {
      console.error("Pause error:", e);
    }
  }

  async seek(positionMs: number, deviceId?: string) {
    if (!this.accessToken) return;
    const query = deviceId ? `?device_id=${deviceId}&position_ms=${positionMs}` : `?position_ms=${positionMs}`;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek${query}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
    } catch (e) {
      console.error("Seek error:", e);
    }
  }

  async setVolume(volumePercent: number, deviceId?: string) {
    if (!this.accessToken) return;
    const query = deviceId ? `?device_id=${deviceId}&volume_percent=${volumePercent}` : `?volume_percent=${volumePercent}`;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume${query}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
    } catch (e) {
      console.error("Volume error:", e);
    }
  }
}

export const spotifyService = new SpotifyService();
