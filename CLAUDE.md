# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm start         # Start dev server at http://localhost:4200 with live reload
npm test          # Run unit tests with Vitest
npm run build     # Create production build in dist/
npm run watch     # Build in watch mode (development)
```

## Architecture

This is an Angular 21 application using the standalone component architecture (no NgModules).

**Key patterns:**
- **Standalone components**: All components use `standalone: true` - no shared modules needed
- **Signal-based state**: Uses Angular Signals for reactive state management
- **Composition-based routing**: Routes configured via `provideRouter()` in `app.config.ts`
- **Bootstrap**: Application bootstraps via `bootstrapApplication()` in `main.ts`

**File structure:**
- `src/app/app.ts` - Root standalone component
- `src/app/app.routes.ts` - Route definitions
- `src/app/app.config.ts` - Application providers configuration
- `src/main.ts` - Application entry point

## Testing

- Test runner: Vitest
- Test files: Co-located with source files using `.spec.ts` suffix
- Run single test file: `npx vitest run src/app/app.spec.ts`

## Code Style

- 2-space indentation
- Single quotes for strings (TypeScript)
- Component selector prefix: `app`
- Strict TypeScript mode enabled
