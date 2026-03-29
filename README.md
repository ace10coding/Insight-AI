# Insight AI

A YouTube creator analytics platform that uses AI to help creators analyze and optimize content.

## Overview

Insight AI is a full-stack web application that reverse-engineers viral videos, identifies high-performing tags, and provides growth strategies for YouTube creators. It serves as an alternative to VidIQ and Outlierkit.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4.0 via `@tailwindcss/vite`
- **Build Tool**: Vite 6
- **Backend**: Express.js (Node.js) with TypeScript
- **AI**: Google Gemini AI (`@google/genai`)
- **Auth & Database**: Firebase (Authentication + Firestore)
- **Data Viz**: Recharts
- **Animations**: Framer Motion

## Project Structure

```
/
├── server.ts          # Express backend + Vite dev middleware
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript config
├── index.html         # React app entry point
├── firebase-applet-config.json  # Firebase configuration
├── firestore.rules    # Firestore security rules
└── src/
    ├── App.tsx        # Main React component (routing, dashboard, landing)
    ├── main.tsx       # React entry point
    ├── firebase.ts    # Firebase SDK initialization
    ├── index.css      # Global styles + Tailwind
    ├── lib/
    │   └── utils.ts   # Utility functions (cn for class merging)
    └── services/
        └── gemini.ts  # Google Gemini AI integration
```

## Environment Variables

- `GEMINI_API_KEY` — Required for AI analysis features (Google Gemini)
- `YOUTUBE_API_KEY` — Required for YouTube channel/video data fetching
- Firebase config is loaded from `firebase-applet-config.json`

## Development

The app runs via `npm run dev` which starts Express with Vite middleware:
- Server port: **5000** (Express + Vite dev server combined)
- Host: `0.0.0.0`

## Key Features

- **Video Analysis**: AI-driven comparison of YouTube videos for SEO and virality
- **Channel Dashboard**: Real-time YouTube data with "outlier" video identification
- **Creator Studio**: AI tools for thumbnails, keywords, video ideas, scripts, and clips
- **User History**: Firebase Firestore saves analysis history

## Deployment

- Target: Autoscale
- Build: `npm run build`
- Run: `node --import tsx/esm server.ts`
