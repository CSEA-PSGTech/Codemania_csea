# 🔥 CODEMANIA — Code Optimization Battle Platform

> A real-time competitive programming platform where teams of two compete to optimize inefficient code for performance and correctness. Built for CSEA coding events supporting 150+ concurrent teams.

![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)
![Nginx](https://img.shields.io/badge/Nginx-Load%20Balancer-green?logo=nginx)

---

## 📐 Architecture Overview

```
┌──────────────┐       ┌────────────────────┐       ┌────────────────────────────────┐
│              │       │                    │       │         Nginx LB (:8080)       │
│   Frontend   │──────▶│  Backend API      │──────▶│  ┌────────┐  ┌────────┐       │
│   (React)    │       │  (Express :5000)   │       │  │ Exec 1 │  │ Exec 2 │       │
│              │       │                    │       │  │ :6001  │  │ :6001  │       │
└──────────────┘       └────────┬───────────┘       │  └────────┘  └────────┘       │
                                │                   │  ┌────────┐  ┌────────┐       │
                                │                   │  │ Exec 3 │  │ Exec 4 │       │
                       ┌────────▼───────────┐       │  │ :6001  │  │ :6001  │       │
                       │  MongoDB Atlas     │       └────────────────────────────────┘
                       │  (Cloud DB)        │               │
                       └────────────────────┘        JVM Worker Pool (2 per instance)
```

**Request Flow:** Browser → Backend (:5000) → Nginx LB (:8080) → Execution Server replicas (:6001)

---

## 🗂 Project Structure

```
CodeMania_Csea/
├── docker-compose.yml              # Multi-container orchestration
├── loadtest.js                     # Load testing script (10 concurrent submissions)
├── .env                            # Environment variables
│
├── backend/
│   ├── core/                       # Main API server (Express + MongoDB + Socket.io)
│   │   ├── app.js                  # Entry point — routes, socket.io, round toggle
│   │   ├── Dockerfile              # Node 20-alpine container
│   │   ├── package.json
│   │   ├── seedTeam.js             # Seed 40 test teams for load testing
│   │   ├── adminServer.js          # Standalone admin server (alternate)
│   │   ├── controllers/
│   │   │   ├── adminController.js  # CRUD questions, teams, submissions, stats
│   │   │   ├── authController.js   # Register, login, admin login
│   │   │   ├── leaderboardController.js  # Leaderboard queries
│   │   │   ├── questionController.js     # Public question endpoints
│   │   │   └── submissionController.js   # Code submission + execution
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification for teams
│   │   │   └── admin.js            # JWT verification for admin
│   │   ├── models/
│   │   │   ├── Question.js         # Question schema (tag, testcases, points decay)
│   │   │   ├── Submission.js       # Submission record (verdict, execution time)
│   │   │   └── Team.js             # Team schema (members, scores, round1 progress)
│   │   ├── routes/
│   │   │   ├── admin.js            # /api/admin/*
│   │   │   ├── auth.js             # /api/auth/*
│   │   │   ├── leaderboard.js      # /api/leaderboard/*
│   │   │   ├── questions.js        # /api/questions/*
│   │   │   └── submissions.js      # /api/submissions/*
│   │   └── utils/
│   │       ├── round1Leaderboard.js    # Speed-based round 1 ranking
│   │       └── socketHandlers.js       # Socket.io event emitters
│   │
│   └── execution-server/          # Sandboxed code execution service
│       ├── server.js               # Express server with concurrency limiter
│       ├── Dockerfile              # JDK 17 + Python 3 + Node 20
│       ├── package.json
│       ├── utils/
│       │   ├── runner.js           # Python/Java code runner with temp dirs
│       │   └── jvmPool.js          # Persistent JVM worker pool (eliminates cold starts)
│       └── jvm-worker/
│           └── JvmWorker.java      # Persistent Java execution daemon
│
├── frontend/                       # React 19 + Vite 7 + Tailwind 4
│   ├── vite.config.js              # Base: /codemania/, code splitting
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx                 # Router (basename="/codemania"), lazy loading
│   │   ├── main.jsx                # React entry point
│   │   ├── config/
│   │   │   └── api.js              # API endpoints + axios config
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page (Three.js 3D particles)
│   │   │   ├── TeamLogin.jsx       # Team auth (teamName + access code)
│   │   │   ├── AdminLogin.jsx      # Admin auth
│   │   │   ├── AdminDashboard.jsx  # Full admin panel (questions, teams, stats)
│   │   │   ├── ChallengeDashboard.jsx  # Question listing + leaderboard modal
│   │   │   └── IdeInterface.jsx    # Code editor + execution + submissions
│   │   ├── components/
│   │   │   ├── FaultyTerminal.jsx  # WebGL matrix rain background (OGL)
│   │   │   └── TargetCursor.jsx    # Custom crosshair cursor (GSAP)
│   │   └── styles/
│   │       ├── App.css             # Glass-morphism, glow effects
│   │       └── index.css           # Tailwind base
│   └── public/
│
└── nginx/
    └── nginx.conf                  # Execution server load balancer config
```

---

## 🏗 Backend — Core API Server

**Stack:** Express 5 · Mongoose 9 · Socket.io 4 · JWT · bcryptjs  
**Port:** 5000

### API Routes

#### Auth (`/api/auth`)

| Method | Endpoint       | Auth | Description                                          |
| ------ | -------------- | ---- | ---------------------------------------------------- |
| `POST` | `/register`    | —    | Register new team (teamName, collegeName, 2 members) |
| `POST` | `/login`       | —    | Login with teamName + shared access code             |
| `GET`  | `/me`          | Team | Get current team info                                |
| `POST` | `/admin/login` | —    | Admin login (username + password)                    |

- **Auth model:** All teams share a common access code (`TEAM_ACCESS_CODE`). No per-team passwords.
- **JWT tokens:** Team tokens expire in 24h, admin tokens in 12h.

#### Questions (`/api/questions`)

| Method | Endpoint         | Auth | Description                               |
| ------ | ---------------- | ---- | ----------------------------------------- |
| `GET`  | `/`              | Team | List all questions (no hidden test cases) |
| `GET`  | `/:id`           | Team | Get question detail + sample test cases   |
| `GET`  | `/round1/status` | Team | Check round 1 active status               |

#### Submissions (`/api/submissions`)

| Method | Endpoint          | Auth | Description                                                |
| ------ | ----------------- | ---- | ---------------------------------------------------------- |
| `POST` | `/`               | Team | Submit code for grading (saves to DB, updates leaderboard) |
| `POST` | `/run`            | Team | Run code against sample tests (no save)                    |
| `GET`  | `/solved`         | Team | Get list of solved question IDs                            |
| `GET`  | `/my`             | Team | Get all submissions for current team                       |
| `GET`  | `/my/:questionId` | Team | Get submissions for a specific question                    |

#### Leaderboard (`/api/leaderboard`)

| Method | Endpoint      | Auth | Description                            |
| ------ | ------------- | ---- | -------------------------------------- |
| `GET`  | `/`           | —    | Overall leaderboard (sorted by points) |
| `GET`  | `/round1`     | —    | Round 1 speed-based leaderboard        |
| `GET`  | `/top/:count` | —    | Top N teams                            |

#### Admin (`/api/admin`)

| Method   | Endpoint           | Auth  | Description                                 |
| -------- | ------------------ | ----- | ------------------------------------------- |
| `GET`    | `/questions`       | Admin | List all questions (with hidden test cases) |
| `POST`   | `/questions`       | Admin | Create question                             |
| `PUT`    | `/questions/:id`   | Admin | Update question                             |
| `DELETE` | `/questions/:id`   | Admin | Delete question + related submissions       |
| `GET`    | `/teams`           | Admin | List all teams                              |
| `DELETE` | `/teams/:id`       | Admin | Delete team                                 |
| `PUT`    | `/teams/:id/reset` | Admin | Reset team progress                         |
| `GET`    | `/submissions`     | Admin | All submissions                             |
| `GET`    | `/stats`           | Admin | Dashboard statistics                        |
| `POST`   | `/round-status`    | Admin | Toggle round 1 active/inactive              |

#### System

| Method | Endpoint            | Description                            |
| ------ | ------------------- | -------------------------------------- |
| `GET`  | `/`                 | Health check                           |
| `GET`  | `/api/round-status` | Round 1 active status (in-memory flag) |

### Data Models

#### Question

```
title          : String (required)
tag            : Enum ['Easy', 'Medium', 'Hard'] (default: 'Medium')
description    : String (required)
constraints    : String
nonOptimizedCode     : String (required) — Python starter code
nonOptimizedCodeJava : String — Java starter code
totalPoints    : Number (required) — base point value
currentPoints  : Number (required) — decays on each solve (-10%, min 50%)
noOfTeamsSolved: Number (default: 0)
timeLimit      : Number (ms, default: 1000)
memoryLimit    : Number (MB, default: 256)
maxInputN      : Number
testcases[]    : { input, output, hidden }
```

**Point Decay:** Each time a team solves a question, `currentPoints` drops by 10%, with a floor of 50% of `totalPoints`. First solvers earn the most.

#### Submission

```
teamId         : ObjectId → Team
questionId     : ObjectId → Question
code           : String
language       : Enum ['python', 'java']
status         : Enum ['AC', 'WA', 'TLE', 'RE', 'CE', 'PENDING']
isCorrect      : Boolean
executionTime  : Number (ms)
passedTestCases: Number
totalTestCases : Number
```

#### Team

```
teamName       : String (unique)
collegeName    : String
user1Name      : String
user2Name      : String
user1Mobile    : String (10 digits)
user2Mobile    : String (10 digits)
solvedCount    : Number
totalSubmissions: Number
totalPoints    : Number
round1         : { questionsSolved, solvedCount, startTime, endTime, totalTime, status, round1Points }
```

### Submission Flow

```
Team submits code
       │
       ▼
  Validate input (code, language)
       │
       ▼
  Check already solved? ──── Yes ──▶ Reject (400)
       │ No
       ▼
  Format test cases
       │
       ▼
  POST to Execution Server via Nginx LB
       │  (x-execution-secret header, 120s timeout)
       ▼
  Receive verdict (AC/WA/TLE/RE/CE)
       │
       ▼
  Save Submission to MongoDB
       │
       ▼
  If AC (first solve):
    ├── Award currentPoints to team
    ├── Increment team.solvedCount
    ├── Decay question.currentPoints by 10%
    ├── Emit Socket.io solve notification
    └── Broadcast updated leaderboard
       │
       ▼
  Return result + test case details
```

### Real-Time Events (Socket.io)

| Event                | Direction       | Payload                                      |
| -------------------- | --------------- | -------------------------------------------- |
| `join-leaderboard`   | Client → Server | —                                            |
| `leaderboard-update` | Server → Room   | Full leaderboard data                        |
| `team-solved`        | Server → Room   | `{ teamName, questionTitle, pointsAwarded }` |
| `round-status`       | Server → All    | `{ round1Active }`                           |

---

## ⚡ Backend — Execution Server

**Stack:** Express 5 · Child Processes · JVM Worker Pool  
**Port:** 6001 (per instance)  
**Languages:** Python 3, Java 17

### Endpoints

| Method | Endpoint   | Auth   | Description                                       |
| ------ | ---------- | ------ | ------------------------------------------------- |
| `GET`  | `/health`  | —      | Status, active jobs, queue length, JVM pool state |
| `POST` | `/execute` | Secret | Execute code against test cases                   |

### Execution Pipeline

```
POST /execute { code, language, testCases, timeLimit }
       │
       ▼
  Concurrency Gate (MAX_CONCURRENT=3 per instance)
       │              │
       │ (if full)    │ (available)
       ▼              ▼
  Queue job       Create temp dir (UUID)
                       │
                       ▼
                  Write code to file
                       │
                  ┌────┴────┐
                  │         │
               Python    Java
                  │         │
                  │    Compile (javac)
                  │         │
                  │    ┌────┴────┐
                  │    │         │
                  │  JVM Pool  Fallback
                  │  (warm)    (cold spawn)
                  │    │         │
                  └────┴────┬────┘
                            │
                       Run tests sequentially
                       (stop on first failure)
                            │
                       Normalize output
                       (trim, True→true, False→false)
                            │
                       Compare expected vs actual
                            │
                       Cleanup temp dir
                            │
                       Return verdict + per-test results
```

### JVM Worker Pool

The JVM cold-start problem (3-5 seconds per Java execution) is solved by maintaining a pool of persistent JVM processes:

- **Pool Size:** 2 workers per execution instance (`JVM_POOL_SIZE`)
- **Worker:** `JvmWorker.java` — a daemon process that stays alive between executions
- **Protocol:** Line-based stdin/stdout communication:
  ```
  Node → JVM: EXEC\n<dir>\n<className>\n<numTests>\n<timeLimit>
  JVM → Node: OK <time_ms> | TLE <time_ms> | RE <error>
  JVM → Node: DONE
  ```
- **Isolation:** Fresh `URLClassLoader` per execution (resets static fields)
- **Auto-recovery:** Dead workers are automatically respawned
- **Result:** Java execution reduced from 20-45s → 1.4-2.5s

### Output Normalization

Both `runner.js` and `jvmPool.js` normalize outputs before comparison:

- Trim leading/trailing whitespace per line
- Remove trailing empty lines
- Normalize Windows `\r\n` → `\n`
- Convert Python `True`/`False` → `true`/`false` (for cross-language consistency)

---

## 🎨 Frontend

**Stack:** React 19 · Vite 7 · Tailwind 4 · Three.js · OGL · GSAP  
**Base Path:** `/codemania/`  
**Theme:** Cyberpunk / hacker aesthetic

### Pages

| Route              | Page                 | Description                                                                        |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------- |
| `/`                | `Home`               | Landing page with 3D particle background (Three.js), phase timeline, feature cards |
| `/team-login`      | `TeamLogin`          | Team authentication (checks round status gate)                                     |
| `/admin`           | `AdminLogin`         | Admin authentication                                                               |
| `/admin/dashboard` | `AdminDashboard`     | Full admin panel — question CRUD, team management, round toggle, stats             |
| `/challenges`      | `ChallengeDashboard` | Question cards with difficulty badges, points, solved status, leaderboard modal    |
| `/ide/:problemId`  | `IdeInterface`       | Split-pane IDE — problem description + code editor + console + submissions         |

### Key Frontend Features

- **Lazy Loading:** All pages are lazy-loaded with `React.lazy()` + `Suspense`
- **Code Splitting:** Manual chunks for `react`, `three`, `ogl` to optimize bundle size
- **Resizable IDE:** Drag divider between problem description and code editor (20-80% range)
- **Custom Cursor:** Crosshair cursor that morphs around hovered elements (GSAP)
- **Matrix Background:** WebGL matrix rain effect using OGL shaders
- **3D Particles:** 2500 cyan particles + torus rings on landing page (Three.js)
- **Real-Time Leaderboard:** Socket.io-powered live leaderboard with solve notifications
- **Health Polling:** IDE polls execution server health every 30 seconds
- **Round Gate:** Team login and challenge pages check `round1Active` status
- **Admin Protection:** `/admin/dashboard` requires `adminToken` in localStorage

### API Client Configuration

```javascript
// Defaults (override via env vars at build time)
EXECUTION_SERVER_URL = "http://localhost:6001";
CORE_BACKEND_URL = "http://localhost:5000";

// Build-time env vars
VITE_EXECUTION_SERVER_URL = "https://your-domain.com/exec";
VITE_CORE_BACKEND_URL = "https://your-domain.com";
```

---

## 🐳 Docker & Load Balancing

### Services

| Service     | Image                       | Port            | Instances    | Resources      |
| ----------- | --------------------------- | --------------- | ------------ | -------------- |
| `backend`   | Node 20-alpine              | 5000            | 1            | —              |
| `execution` | JDK 17 + Python 3 + Node 20 | 6001 (internal) | 4 (scalable) | 2 CPU, 1GB RAM |
| `nginx`     | nginx:alpine                | 8080            | 1            | —              |

### Nginx Load Balancer

The nginx service sits between the backend and execution servers:

- **DNS Resolution:** Uses Docker embedded DNS (`127.0.0.11`) to discover execution replicas
- **Round-Robin:** Distributes `/execute` and `/health` requests across all replicas
- **DNS Re-resolution:** Uses `set $target` pattern to resolve IPs per-request (handles container restarts)
- **Timeouts:** Connect 10s, Read 60s, Send 30s

### Capacity Planning

| Component       | Per Instance | 4 Instances |
| --------------- | ------------ | ----------- |
| Concurrent jobs | 3            | 12 parallel |
| JVM workers     | 2            | 8 warm JVMs |
| Max throughput  | ~3.5 sub/s   | ~12 sub/s   |

**Load Test Result (10 simultaneous submissions):**

```
Total time (wall clock):  2.9s
Avg response time:        2.4s
Success rate:             100% (10/10)
Throughput:               3.46 submissions/sec
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux)
- [Node.js 20+](https://nodejs.org/) (for local development / frontend dev server)
- MongoDB Atlas account (or local MongoDB)

### Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/CodeMania

# Authentication
JWT_SECRET=your_jwt_secret_key
TEAM_ACCESS_CODE=CODEMANIA2026

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
ADMIN_SECRET=your_admin_jwt_secret

# Execution
EXECUTION_SECRET=your_execution_secret_key
```

### Run with Docker (Production)

```bash
# Start all services with 4 execution instances
docker compose up --build --scale execution=4

# Backend:    http://localhost:5000
# Nginx LB:   http://localhost:8080
# Health:      http://localhost:8080/health
```

### Run Locally (Development)

```bash
# Terminal 1 — Backend
cd backend/core
npm install
npm run dev

# Terminal 2 — Execution Server
cd backend/execution-server
npm install
npm run dev

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173/codemania/
```

### Seed Test Data

```bash
# Seed 40 test teams with varying scores
cd backend/core
node seedTeam.js
```

### Load Testing

```bash
# Run 10 simultaneous submissions against the backend
node loadtest.js
```

---

## 🎮 Competition Flow

### Phase 1 — Code Optimization

1. Admin creates questions with inefficient starter code (O(n²) solutions)
2. Admin activates Round 1 via dashboard toggle
3. Teams login with team name + shared access code
4. Teams receive the same unoptimized code and must optimize it
5. Submissions are graded: **AC** (all test cases pass) or **WA/TLE/RE/CE**
6. Points decay with each solve — first solvers earn the most
7. Live leaderboard updates via Socket.io

### Phase 2 — Problem Solving (Bidding)

1. Qualified teams from Phase 1 advance
2. Teams bid on questions using earned points
3. Win the bid, solve the problem, and score big

---

## 🔧 Key Technical Decisions

| Decision                         | Rationale                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **JVM Worker Pool**              | Eliminates 3-5s Java cold-start overhead → 1.4-2.5s execution                                            |
| **Nginx LB over direct calls**   | Docker DNS round-robin distributes load across execution replicas                                        |
| **`set $target` nginx pattern**  | Open-source nginx doesn't support `resolve` in upstream; variable approach forces DNS lookup per request |
| **In-memory round toggle**       | Simple and fast; doesn't persist across restarts (intentional for event use)                             |
| **Shared access code**           | Simplifies auth for 150+ teams at a physical event; no password management                               |
| **Point decay (10%, floor 50%)** | Rewards fast solvers; prevents late-comers from getting full points                                      |
| **Stop on first failure**        | Sequential test execution stops on first WA/TLE/RE for fast feedback                                     |
| **React lazy loading**           | Three.js (600KB+) only loads on Home page, OGL only on pages with matrix background                      |
| **Manual Vite chunks**           | Separates heavy 3D libraries from core React bundle for faster initial load                              |
| **Output normalization**         | `True`→`true`, `False`→`false` ensures Python and Java solutions are compared consistently               |

---

## 📊 Monitoring

- **Execution Health:** `GET http://localhost:8080/health`
  ```json
  {
    "status": "ok",
    "port": 6001,
    "activeJobs": 0,
    "queueLength": 0,
    "maxConcurrent": 3,
    "jvmPool": "active"
  }
  ```
- **Backend Health:** `GET http://localhost:5000/`
- **Nginx Status:** `GET http://localhost:8080/nginx-status`
- **Docker Logs:** `docker compose logs -f execution` / `backend` / `nginx`

---

## 🛠 Scaling

```bash
# Scale to 8 execution instances for larger events
docker compose up --scale execution=8

# Capacity: 8 × 3 = 24 parallel jobs, 8 × 2 = 16 warm JVMs
```

Adjust per-instance limits in `docker-compose.yml`:

```yaml
environment:
  - MAX_CONCURRENT=3 # Jobs per instance
  - JVM_POOL_SIZE=2 # Warm JVMs per instance
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 1G
```

---

## 📜 License

ISC

---

Built with 🔥 for **CSEA CODEMANIA 2026**
