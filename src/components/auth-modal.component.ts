import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
        <button (click)="close.emit()" class="absolute top-4 right-4 text-slate-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 class="text-2xl font-bold text-white mb-6 text-center">
          {{ isLogin() ? 'Welcome Back' : 'Create Account' }}
        </h2>

        <form (submit)="handleSubmit($event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">Username</label>
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username"
              required
              class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Enter your username"
            >
          </div>

          <button 
            type="submit" 
            [disabled]="!username()" 
            class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLogin() ? 'Log In' : 'Sign Up' }}
          </button>
        </form>

        <div class="mt-6 text-center">
          <button (click)="isLogin.set(!isLogin())" class="text-indigo-400 hover:text-indigo-300 text-sm">
            {{ isLogin() ? 'Need an account? Sign up' : 'Already have an account? Log in' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
  `]
})
export class AuthModalComponent {
  close = output<void>();
  submit = output<string>();
  
  username = signal('');
  isLogin = signal(true);

  handleSubmit(e: Event) {
    e.preventDefault();
    if (this.username()) {
      this.submit.emit(this.username());
    }
  }
}
