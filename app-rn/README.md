# JOBBIE – React Native (Expo)

Mobile app for JOBBIE (Android, iOS, web) built with **Expo** and **expo-router**.

## Setup

1. **Install dependencies**
   ```bash
   cd app-rn && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` and set:
     - `EXPO_PUBLIC_API_BASE_URL` – backend API (default: `http://localhost:8000`)
     - `EXPO_PUBLIC_SUPABASE_URL` – Supabase project URL
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key

3. **Run**
   ```bash
   npx expo start
   ```
   - Press `a` for Android, `i` for iOS, or `w` for web.

## Features

- Auth (login, register, roles: individual / company)
- Home: list active jobs, search, open job detail
- Offers: my jobs + my applications; open job or chat
- Add job: create draft or publish (Stripe checkout for paid publish)
- Messages: chat room list → open chat
- Chat: Socket.IO room, send/receive messages
- Profile: edit profile, link to Plans, logout
- Plans: list plans, current subscription, select plan (free or Stripe checkout)

## Backend

Expects the JOBBIE NestJS API and Socket.IO on the same host as `EXPO_PUBLIC_API_BASE_URL` (e.g. `http://localhost:8000`). Auth uses Supabase JWT; backend validates via JWKS.
