# Collections App

A modern, mobile-friendly web application for managing and showcasing your personal collections. Whether you collect bottle caps, stamps, coins, or any other items - this app helps you organize, track, and share your treasures.

### [Try Collections App](https://collectionsapp-8e82a.web.app/)

---

## Features

**Organize Your Collections**
- Create multiple collections for different types of items
- Add items with photos, names, and descriptions
- Tag items with custom attributes for easy filtering

**Smart Image Handling**
- Upload images or capture directly from your camera
- Built-in image cropper with rectangle and circle modes
- Transparent background support for circular crops

**Search & Discovery**
- Full-text search across your collection
- Filter and browse items quickly
- Check for duplicates before adding new items

**Secure & Personal**
- Google authentication for secure access
- Your collections are private by default
- Share specific collections publicly if you want

**Mobile First**
- Fully responsive design
- Works great on phones, tablets, and desktops
- Touch-friendly interface

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Angular 21** | Frontend framework with standalone components |
| **TypeScript** | Type-safe development |
| **Angular Signals** | Reactive state management |
| **Firebase Hosting** | Fast, secure deployment |
| **ngx-image-cropper** | Image manipulation |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/collections-app.git

# Navigate to project directory
cd collections-app

# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm test` | Run unit tests with Vitest |

---

## Project Structure

```
src/
├── app/
│   ├── core/           # Auth, guards, models
│   ├── features/       # Main feature modules
│   │   ├── collection/     # Collection management
│   │   └── public-collection/
│   ├── pages/          # Route pages (home, contact, login)
│   └── shared/         # Shared components (navbar)
├── environments/       # Environment configs
└── styles.css          # Global styles
```

---

## Author

**Kamil Machul** - Software Developer & Collector

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/kamil-machul/)

---

## License

This project is private. All rights reserved.
