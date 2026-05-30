import { Injectable, signal } from '@angular/core';
import { User } from '@features/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly USER_STORAGE_KEY = 'share-care-user';
  private readonly userSignal = signal<User | null>(this.loadUserFromStorage());

  constructor() {
    if (!this.userSignal()) {
      this.initializeDefaultUser();
    }
  }

  getUser() {
    return this.userSignal.asReadonly();
  }

  setUser(user: User): void {
    this.userSignal.set(user);
    this.saveUserToStorage(user);
  }

  private loadUserFromStorage(): User | null {
    try {
      const stored = localStorage.getItem(this.USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveUserToStorage(user: User): void {
    try {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user to localStorage:', error);
    }
  }

  private initializeDefaultUser(): void {
    const defaultUser: User = {
      id: 1,
      name: 'Current User',
      email: 'user@sharecare.local',
      passwordHash: '',
    };
    this.setUser(defaultUser);
  }
}
