
import { User, CloudData, Task, SessionLog, SessionConfig } from '../types';

// Mock "Server" Storage Keys
const USERS_KEY = 'promodo_cloud_users';
const DATA_KEY_PREFIX = 'promodo_cloud_data_';

class AuthService {
  
  // --- Helpers ---
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getUsers(): User[] {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  private saveUsers(users: User[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private getUserData(userId: string): CloudData | null {
    const data = localStorage.getItem(DATA_KEY_PREFIX + userId);
    return data ? JSON.parse(data) : null;
  }

  private saveUserData(userId: string, data: CloudData) {
    localStorage.setItem(DATA_KEY_PREFIX + userId, JSON.stringify(data));
  }

  // --- Auth API ---

  async signup(email: string, password: string, name: string): Promise<{ user: User, error?: string }> {
    await this.delay(800); // Network simulation
    
    const users = this.getUsers();
    if (users.find(u => u.email === email)) {
      return { user: {} as User, error: "Email already exists." };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      createdAt: Date.now()
    };

    // Store user credentials (password strictly simulated, not stored in this mock to avoid bad habits even in mocks)
    // In a real app, hash password here.
    users.push(newUser);
    this.saveUsers(users);

    return { user: newUser };
  }

  async login(email: string, password: string): Promise<{ user: User, error?: string }> {
    await this.delay(800);
    
    const users = this.getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return { user: {} as User, error: "Invalid credentials." };
    }
    
    // In real app: verify password. Here we assume success if email exists for demo simplicity
    return { user };
  }

  // --- Cloud Sync API ---

  async backupData(userId: string, tasks: Task[], history: SessionLog[], config: SessionConfig): Promise<boolean> {
    await this.delay(1000); // Simulate upload
    
    const cloudPayload: CloudData = {
      tasks,
      history,
      config,
      lastSynced: Date.now()
    };

    this.saveUserData(userId, cloudPayload);
    console.log("[Cloud] Backup successful for user", userId);
    return true;
  }

  async restoreData(userId: string): Promise<CloudData | null> {
    await this.delay(1000); // Simulate download
    return this.getUserData(userId);
  }
}

export const authService = new AuthService();
