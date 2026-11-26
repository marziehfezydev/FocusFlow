# FocusFlow — Build Your Better Day

A daily-routine dashboard with a Minecraft-style look. Complete your goals, earn XP, level up and watch your voxel village grow while a pixel character acts out your tasks.

**Live demo:** https://focus-flow-final-alpha.vercel.app/

![FocusFlow dashboard](screenshots/FocusFlow.png)

## Features

- **Daily plan** with an animated pixel character
- **XP, levels and a village** that grows as you make progress
- **AI coach** that reviews your day and suggests changes (works offline too)
- **Focus mode** with a Pomodoro timer
- **Habits, calendar and statistics**
- **Personal accounts**, English/Persian quotes and 8-bit sounds

## Highlights

- Character, sprites and isometric village drawn in code with SVG, animated with CSS
- XP, levels and streaks calculated on the server
- Password hashing with scrypt and signed login tokens
- AI coach that falls back to a built-in rule-based coach

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Storage:** JSON files or Upstash Redis
- **AI:** Anthropic API (optional)
- **Hosting:** Vercel

## Run locally

Requires Node.js 20 or newer.

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev
```

The app runs at http://localhost:5173. Optional settings are described in [`server/.env.example`](server/.env.example).

## Notes

Built with assistance from Claude (Anthropic).
