# FocusFlow — Build Your Better Day

**Live demo:** https://focus-flow-final-alpha.vercel.app/

A daily-routine dashboard that looks and feels like a Minecraft world. Check off your goals and a pixel character acts them out, earn XP, level up, and watch a voxel village grow block by block. An AI coach reviews your plan and suggests a better one when your day goes off track.

Built with **React, TypeScript, Tailwind CSS** and a **Node/Express** backend.

![FocusFlow dashboard](screenshots/FocusFlow.png)

## Features

- **Daily plan with a living character.** Add a goal like "Drink 8 glasses of water" and the pixel character drinks water. Exercise, studying, coding, reading, planning, German practice, sleeping and meditating each have their own animation, picked from the words in the goal. Anything unrecognised gets a calm idle pose.
- **XP, levels and a voxel village.** Tasks give 10–120 XP, habits +15, focus time 1 XP per minute, and a full day (3+ goals) +50. Every 250 XP builds a new piece of your isometric village (25 in total: cottage, well, wheat farm, watch tower and more). Every 1000 XP is a level-up.
- **AI coach "Bit".** Reviews today's plan and answers in a short message with one-click suggestions (add a task, move one to tomorrow). Also has a chat, and writes an end-of-day "one good thing" note.
- **Focus mode.** A block-style Pomodoro timer that survives page reloads, logs each session and awards XP.
- **Habits, calendar, statistics.** Weekly habit tracker with streaks, a month calendar, and charts for tasks, XP and focus time over 7 or 30 days.
- **Daily quote** in English or Persian, plus Persian/RTL text support.
- **Accounts.** Username and password login. Each person has their own data and village.
- **Sound effects.** Small 8-bit sounds generated with the Web Audio API (can be turned off).

## Tech stack

| Part     | Technology                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 6, React Router 7, Tailwind CSS 4                                          |
| Graphics | Hand-written SVG: the character, sprites and the isometric village are drawn in code, no image assets |
| Backend  | Node.js, Express, TypeScript (run with `tsx`)                                                         |
| Storage  | One JSON file per user (`server/data/users/`), or Upstash Redis when deployed serverless              |
| Auth     | scrypt-hashed passwords, HMAC-signed tokens, login throttling                                         |
| AI       | Anthropic API (optional) with a built-in rule-based fallback                                          |

## Getting started

Requires **Node.js 20 or newer**.

```bash
# 1. install everything (root, client and server)
npm run install:all

# 2. create your settings file
cp server/.env.example server/.env

# 3a. development: API on :4000, app on http://localhost:5173
npm run dev

# 3b. or run as one process: build once, then start
npm run build
npm start          # http://localhost:4000 serves the API and the web app
```

On first visit, create an account. By default only 2 accounts can be created (see `MAX_USERS`).

### Configuration (`server/.env`)

| Variable                            | Purpose                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `MAX_USERS`                         | How many accounts may ever be created. Default `2`.                                                            |
| `INVITE_CODE`                       | If set, registration requires this code. Recommended when the app is reachable from the internet.              |
| `FOCUSFLOW_SECRET`                  | Secret used to sign login tokens. Generated into `server/data/secret.key` if empty.                            |
| `DATA_DIR`                          | Where user data is stored. Point it at a persistent disk when hosting.                                         |
| `ANTHROPIC_API_KEY`                 | Enables Claude-powered coaching. Optional.                                                                     |
| `FOCUSFLOW_MODEL`                   | Model used for coaching. Default `claude-haiku-5-5`.                                                           |
| `PORT`                              | Server port. Default `4000`.                                                                                   |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Use a hosted Redis instead of files (required on Vercel).                                                      |
| `MAX_GUESTS`                        | Enables the one-click "Try the demo" button: max guest worlds per day (they expire after 7 days). Needs Redis. |

## Live demo on Vercel

Vercel serverless functions have no persistent disk, so on Vercel the app stores data in Upstash Redis (free tier). The backend and the frontend are **two Vercel projects** from the same repo:

1. **Backend** — New Project → import the repo → _Root Directory_ `server`. Turn on _Include source files outside of the Root Directory_. Under _Storage_, create an Upstash Redis database and connect it. Add `MAX_GUESTS=20` (demo button) and optionally `MAX_USERS` / `INVITE_CODE`. Deploy and copy its URL.
2. **Frontend** — New Project → same repo → _Root Directory_ `client`, framework Vite. Add `VITE_API_URL` = the backend URL (no trailing slash). Deploy.

## How it works

**Character animations.** The server detects a task's type from keywords in its title (English and Persian), and the client plays the matching CSS animation on the SVG character. The set of animations is hand-made and limited; the AI does not create new ones.

**XP and village.** All XP, level and streak calculations happen on the server, so the client always shows the same numbers. The village is a list of 3D boxes projected to isometric SVG polygons and painter-sorted by depth. Each unlocked piece is added to the scene, and the next one appears as a ghost outline that fills in as XP grows.

**AI coach.** `server/src/ai.ts` has two paths:

- **Claude mode** (when `ANTHROPIC_API_KEY` is set): the server sends today's tasks, time of day, streak and weekly completion rate and asks for a JSON reply. Suggestions are validated before they reach the app (for example, a "move task" suggestion must reference a real task id).
- **Offline mode** (default): a rule-based coach, written in code, that reacts to the time of day, overload (more than 10 planned hours), progress and missing movement. If a Claude request fails, the app falls back to this automatically.

**Auth.** Passwords are hashed with scrypt and tokens are HMAC-signed with a 30-day expiry. Every `/api` route except login and register requires a token, and every request reads and writes only the logged-in user's file.

## Project structure

```
client/src/components   Avatar (SVG character), Cube, Sprite, IsoScene (village), Layout, AuthGate
client/src/pages        Dashboard, Tasks, Calendar, Habits, Focus, Companion, Stats, Village, Settings
client/src/lib          date helpers, 8-bit sound, village pieces
server/src              index.ts (routes), auth.ts, db.ts, store.ts (files/Redis), ai.ts, xp.ts, quotes.ts
shared/types.ts         types shared by client and server
docs/screenshots        images used in this README
```

## Roadmap

- Password reset and account deletion
- More character animations (walking, driving, cooking, cleaning)
- Automated tests
- Pluggable AI provider

## Notes

Built with assistance from Claude (Anthropic).
