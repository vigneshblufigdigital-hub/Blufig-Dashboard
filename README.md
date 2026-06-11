# Blufig Agency Management Platform

An enterprise-grade project management and client portal solution designed specifically for digital marketing agencies.

## Features

- **Dynamic Dashboard**: Real-time metrics for campaign performance, billing, and team utilization.
- **Advanced Task Engine**: Granular task management with sub-task breakdowns and progress tracking.
- **Client Portal**: Dedicated secure space for clients to review deliverables, provide feedback, and approve assets.
- **AI Assignment Index**: Gemini-powered task suggestion engine that matches tasks to experts based on skill sets.
- **Report Builder**: Automatically fetch and visualize platform data with AI-generated strategic commentary.
- **Real-time Time Tracking**: Integrated timer for billable hour synchronization.
- **Team Directory**: Expertise-focused employee directory for optimal resource planning.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **Backend / Database**: Firebase (Auth & Firestore)
- **AI**: Google Gemini API
- **Icons**: Lucide React
- **UI Components**: Radix UI + shadcn/ui patterns

## Getting Started

### 1. Prerequisites

- Node.js 20+ 
- Firebase Project
- Google Gemini API Key

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Ensure your `firebase-applet-config.json` is populated with your Firebase project credentials.

### 3. Installation

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

### 5. Build

```bash
npm run build
```

## Deployment to Vercel

1. **Connect Repository**: Connect your GitHub/GitLab/Bitbucket repository to Vercel.
2. **Framework Preset**: Select **Vite**.
3. **Environment Variables**: Add `VITE_GEMINI_API_KEY` in the Vercel project settings.
4. **Build Command**: Use `npm run build`.
5. **Output Directory**: `dist`.

## Project Structure

- `/components/ui`: Core reusable UI components (Radix primitives).
- `/src/components/dashboard`: Core workspace views (Overview, Tasks, Projects).
- `/src/components/portal`: Client-facing portal components.
- `/src/lib`: Core utilities (Firebase config, AI services, cn helper).
- `/src/mockData.ts`: Realistic prototype data for immediate demonstration.

## Security

The project includes pre-configured `firestore.rules` that enforce:
- Role-Based Access Control (RBAC).
- Internal vs Client data isolation.
- Immutable system fields.
- Identity verification.

---
Built with Google AI Studio Build.
