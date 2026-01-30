import { Injectable, signal, effect } from '@angular/core';
import { User, Palette } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  
  constructor() {
    const storedUser = localStorage.getItem('chromagen_user');
    if (storedUser) {
      this.currentUser.set(JSON.parse(storedUser));
    }

    // Auto-save user data when it changes
    effect(() => {
      const user = this.currentUser();
      if (user) {
        localStorage.setItem('chromagen_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('chromagen_user');
      }
    });
  }

  login(username: string) {
    // Mock login - in a real app this would verify credentials
    // We try to find existing data for this username in a separate store or just create a new session
    // For this demo, we just create a session.
    const savedData = localStorage.getItem(`chromagen_data_${username}`);
    const savedPalettes = savedData ? JSON.parse(savedData) : [];
    
    this.currentUser.set({
      username,
      savedPalettes
    });
  }

  logout() {
    this.currentUser.set(null);
  }

  savePalette(palette: Palette) {
    this.currentUser.update(user => {
      if (!user) return null;
      // Check if already saved
      if (user.savedPalettes.find(p => p.id === palette.id)) return user;
      
      const updatedUser = {
        ...user,
        savedPalettes: [palette, ...user.savedPalettes]
      };
      
      // Persist to "db" (localstorage with username key)
      localStorage.setItem(`chromagen_data_${user.username}`, JSON.stringify(updatedUser.savedPalettes));
      
      return updatedUser;
    });
  }

  removePalette(paletteId: string) {
    this.currentUser.update(user => {
      if (!user) return null;
      const updatedUser = {
        ...user,
        savedPalettes: user.savedPalettes.filter(p => p.id !== paletteId)
      };
      localStorage.setItem(`chromagen_data_${user.username}`, JSON.stringify(updatedUser.savedPalettes));
      return updatedUser;
    });
  }

  isSaved(paletteId: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return !!user.savedPalettes.find(p => p.id === paletteId);
  }
}
