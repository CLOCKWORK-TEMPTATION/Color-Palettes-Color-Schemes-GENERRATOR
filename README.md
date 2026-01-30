<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ChromaGen AI - Color Palette Generator

An intelligent color palette generator powered by Gemini AI. Describe a mood, theme, or object, and get a perfectly curated color scheme with hex codes and design rationale.

View your app in AI Studio: https://ai.studio/apps/drive/1uqfiVd8w92E7lQXooyNKIWSqiGFT3hlc

## Project Structure

```
src/
├── app/                          # Main application folder
│   ├── core/                     # Core module (singleton services, app-wide)
│   │   ├── models/               # TypeScript interfaces and types
│   │   │   ├── types.ts          # Core type definitions
│   │   │   └── index.ts          # Barrel export
│   │   ├── services/             # Injectable services
│   │   │   ├── ai.service.ts     # Gemini AI integration
│   │   │   ├── auth.service.ts   # Authentication service
│   │   │   ├── color-math.service.ts    # Color calculations (CIEDE2000)
│   │   │   ├── export.service.ts        # Export functionality
│   │   │   ├── preference-learning.service.ts  # ML preference learning
│   │   │   └── index.ts          # Barrel export
│   │   └── index.ts              # Core module export
│   ├── shared/                   # Shared module (reusable components)
│   │   ├── components/           # Reusable UI components
│   │   │   ├── auth-modal.component.ts
│   │   │   ├── copy-icon.component.ts
│   │   │   ├── loader.component.ts
│   │   │   └── index.ts          # Barrel export
│   │   └── index.ts              # Shared module export
│   ├── features/                 # Feature modules (for future expansion)
│   │   └── color-generator/      # Color generator feature
│   ├── app.component.ts          # Main app component
│   └── app.component.html        # Main app template
├── assets/                       # Static assets
├── environments/                 # Environment configurations
│   ├── environment.ts            # Development environment
│   └── environment.prod.ts       # Production environment
└── styles/                       # Global styles
    └── global.css                # Global CSS styles
```

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

- `@app/*` → `./src/app/*`
- `@core/*` → `./src/app/core/*`
- `@shared/*` → `./src/app/shared/*`
- `@features/*` → `./src/app/features/*`
- `@environments/*` → `./src/environments/*`

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
