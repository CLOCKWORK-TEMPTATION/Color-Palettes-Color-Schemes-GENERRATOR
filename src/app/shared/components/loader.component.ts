import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center space-y-4 p-8">
      <div class="relative w-16 h-16">
        <div class="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/30 rounded-full animate-ping"></div>
        <div class="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p class="text-indigo-300 font-medium animate-pulse">Mixing colors...</p>
    </div>
  `
})
export class LoaderComponent {}
