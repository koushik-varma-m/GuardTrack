# Guard Track Web

React + TypeScript + Vite web application for the Guard Monitoring System.

## Prerequisites

- Node.js (LTS version)
- npm or yarn

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (if needed)
   - Update `VITE_API_BASE_URL` to point to your backend API

3. **Run the development server:**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:5173` (or the port Vite assigns).

## Project Structure

```
/src
  /pages          - Page components
    /auth         - Authentication pages
    /admin        - Admin pages
    /analyst      - Analyst pages
    /guard        - Guard pages
  /components    - Reusable components
  /layouts        - Layout components
  /context        - React context providers
  /services       - API service functions
  /hooks          - Custom React hooks
  App.tsx         - Main app component with routing
  main.tsx        - Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router v6
- Material UI (MUI)
- Emotion (for styling)
