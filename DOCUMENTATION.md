# Ada Practice Room — Technical Documentation

> AI-powered professional roleplay simulator for Nigerian women in tech.
> A standalone product of G3Women Digital Academy.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [AI Architecture](#3-ai-architecture)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Database Schema](#5-database-schema)
6. [Practice Session Flow](#6-practice-session-flow)
7. [Scenario System](#7-scenario-system)
8. [API Reference](#8-api-reference)
9. [Component Architecture](#9-component-architecture)
10. [Monetization & Access Control](#10-monetization--access-control)
11. [Multilingual System](#11-multilingual-system)
12. [Environment Variables](#12-environment-variables)
13. [Directory Structure](#13-directory-structure)

---

## 1. Product Overview

Ada Practice Room lets users pick a professional scenario (job interview, salary negotiation, client pitch, etc.), practice live in a conversation with **Ada** — an AI persona powered by Google Gemini — and receive a structured AI-generated feedback report at the end.

**Target users:** Nigerian women in tech  
**Revenue model:** Freemium (3 free sessions/month; Pro tier for unlimited + advanced scenarios)  
**Languages supported:** English, Hausa (ha), Yoruba (yo), Igbo (ig)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │  Auth Pages  │  │   Dashboard /    │  │   Practice Room     │  │
│  │ (signin,     │  │   History /      │  │  (scenario-grid,    │  │
│  │  signup)     │  │   Profile        │  │   practice-room,    │  │
│  └──────┬───────┘  └────────┬─────────┘  │   feedback-report)  │  │
│         │                   │            └──────────┬──────────┘  │
└─────────┼───────────────────┼───────────────────────┼─────────────┘
          │                   │                       │
          ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS APP ROUTER                            │
│                                                                     │
│  Route Groups:                                                      │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  (auth)/       │  │   (main)/        │  │   API Routes      │  │
│  │  signin        │  │   dashboard      │  │                   │  │
│  │  signup        │  │   practice       │  │   /api/auth/      │  │
│  └────────────────┘  │   practice/[id]  │  │   /api/ai/        │  │
│                       │   history        │  │   /api/sessions/  │  │
│                       │   profile        │  └──────────┬────────┘  │
│                       └──────────────────┘             │           │
└────────────────────────────────────────────────────────┼───────────┘
                                                         │
                    ┌────────────────────────────────────┤
                    │                                    │
                    ▼                                    ▼
     ┌──────────────────────────┐      ┌────────────────────────────┐
     │     SUPABASE (Postgres)  │      │    GOOGLE GEMINI API       │
     │                          │      │                            │
     │  profiles                │      │  gemini-2.0-flash-lite     │
     │  practice_sessions       │      │  (configurable via env)    │
     │  session_messages        │      │                            │
     │  feedback_reports        │      │  • Practice endpoint       │
     │                          │      │  • Feedback endpoint       │
     │  Row-Level Security      │      │  • Brief endpoint          │
     └──────────────────────────┘      └────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Animation | Framer Motion |
| Auth | NextAuth v4 (JWT strategy) |
| Database | Supabase (PostgreSQL + RLS) |
| AI | Google Gemini 2.0 Flash Lite (REST, no SDK) |
| Package Manager | pnpm |

---

## 3. AI Architecture

Ada Practice Room calls the Gemini API directly via REST — no Google AI SDK is used. This keeps the dependency surface small and mirrors the pattern used in the G3Women Academy's Aunty Ada chatbot.

### 3.1 High-Level AI Flow

```
USER MESSAGE
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│                    /api/ai/practice                            │
│                                                                │
│  1. Auth check (NextAuth session)                              │
│  2. Rate limit check (60 msgs/user/hour via Supabase count)    │
│  3. Fetch scenario definition from lib/scenarios.ts            │
│  4. Fetch last N messages from session_messages table          │
│  5. Build system prompt (persona + scenario + language + tips) │
│  6. Append conversation history                                │
│  7. POST to Gemini generateContent REST endpoint               │
│  8. Parse response text                                        │
│  9. Persist both user message + AI response to DB              │
│  10. Return AI response to client                              │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
ADA'S RESPONSE DISPLAYED IN PRACTICE ROOM
```

### 3.2 Gemini API Integration

The API key is **split on whitespace** before use — this is a guard against Cloud Run occasionally injecting trailing newlines or spaces into environment variable values.

```
app/api/ai/practice/route.ts
app/api/ai/feedback/route.ts
app/api/ai/brief/route.ts
```

Each endpoint constructs the request body manually:

```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "..." }] },
    { "role": "model", "parts": [{ "text": "..." }] },
    ...
  ],
  "systemInstruction": {
    "parts": [{ "text": "<full system prompt>" }]
  },
  "generationConfig": {
    "temperature": 0.9,
    "maxOutputTokens": 1024
  }
}
```

The `systemInstruction` field is used (not the first user turn), which is the correct pattern for Gemini 1.5+ models.

### 3.3 System Prompt Architecture

The practice endpoint builds Ada's system prompt dynamically from four layers:

```
┌──────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                         │
│                                                          │
│  Layer 1 — Core Identity                                 │
│  ─────────────────────────                               │
│  "You are Ada, a professional AI coach helping Nigerian  │
│  women in tech. You are playing the role of [persona]."  │
│                                                          │
│  Layer 2 — Scenario Persona                              │
│  ─────────────────────────                               │
│  scenario.persona (e.g., "You are a senior engineering   │
│  manager at a Lagos fintech company conducting a         │
│  technical interview for a backend role...")             │
│                                                          │
│  Layer 3 — Language Instruction                          │
│  ─────────────────────────────                           │
│  "Respond ONLY in [language]. Keep responses natural     │
│   and conversational."  (en | ha | yo | ig)              │
│                                                          │
│  Layer 4 — Behavioral Rules                              │
│  ──────────────────────────                              │
│  • Stay in character throughout                          │
│  • Keep responses to 2-4 sentences                       │
│  • Be realistic but encouraging                          │
│  • React naturally to what the user says                 │
│  • Do not break character to give coaching advice        │
└──────────────────────────────────────────────────────────┘
```

### 3.4 Feedback Generation

After the session ends, `/api/ai/feedback` assembles the full conversation transcript and asks Gemini to produce a **structured JSON** feedback report.

```
SESSION ENDS
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│                    /api/ai/feedback                            │
│                                                                │
│  1. Fetch all session_messages for the session                 │
│  2. Format transcript as "User: ... / Ada: ..."                │
│  3. Build evaluator prompt (scenario.evaluationFocus)          │
│  4. Instruct Gemini to output strict JSON schema               │
│  5. POST to Gemini                                             │
│  6. Parse and validate JSON response                           │
│  7. Store in feedback_reports table                            │
│  8. Mark practice_sessions.status = 'completed'                │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
FEEDBACK REPORT RENDERED IN BROWSER
```

**Feedback JSON schema returned by Gemini:**

```json
{
  "overall_score": 78,
  "confidence_score": 72,
  "clarity_score": 85,
  "relevance_score": 80,
  "strengths": [
    "Clearly articulated your experience with distributed systems",
    "Asked clarifying questions when requirements were ambiguous"
  ],
  "improvements": [
    "Quantify achievements with specific metrics",
    "Slow down when explaining complex technical concepts"
  ],
  "key_moments": [
    {
      "moment": "When asked about your biggest failure...",
      "feedback": "Strong STAR structure but missed the learnings part"
    }
  ],
  "next_tips": [
    "Practice the STAR method for behavioral questions",
    "Prepare 3 specific examples of technical leadership"
  ],
  "summary": "A solid performance showing strong technical knowledge..."
}
```

### 3.5 Rate Limiting

Rate limiting is implemented without Redis — it queries Supabase directly.

```
Per user: 60 practice messages / hour

Check: SELECT COUNT(*) FROM session_messages
       WHERE user_id = $1
       AND role = 'user'
       AND created_at > NOW() - INTERVAL '1 hour'

If count >= 60 → return 429 Too Many Requests
```

This is enforced in `/api/ai/practice/route.ts` before the Gemini call.

### 3.6 Session Brief (Pre-Session Context)

`/api/ai/brief` is an optional endpoint that generates a short context briefing before the session starts — it can receive a `userProfile` object (role, years of experience, goals) to personalise the opening line and difficulty calibration.

```
┌──────────────────────────────────────┐
│  userProfile (optional)              │
│  • currentRole                       │
│  • yearsExperience                   │
│  • targetRole                        │
│  • specificGoals                     │
└─────────────────┬────────────────────┘
                  │
                  ▼
          /api/ai/brief
                  │
                  ▼
      Gemini generates sessionBrief
      (2-3 sentences of scene-setting)
                  │
                  ▼
      Stored in practice_sessions.brief
      and passed to practice endpoint
      to prime Ada's first response
```

---

## 4. Authentication Architecture

NextAuth v4 with JWT strategy. Supabase Adapter is intentionally **not used** — user IDs are managed by NextAuth, and Supabase rows use those IDs as TEXT foreign keys.

### 4.1 Auth Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    SIGN IN OPTIONS                         │
│                                                            │
│  ┌─────────────────┐        ┌───────────────────────────┐ │
│  │   Google OAuth  │        │   Email + Password        │ │
│  └────────┬────────┘        └──────────────┬────────────┘ │
└───────────┼─────────────────────────────────┼─────────────┘
            │                                 │
            ▼                                 ▼
    NextAuth Google Provider        NextAuth Credentials Provider
            │                                 │
            │                         bcrypt.compare(password,
            │                           profiles.password_hash)
            │                                 │
            └──────────────┬──────────────────┘
                           │
                           ▼
                   NextAuth JWT Callback
                           │
                   ┌───────┴──────────┐
                   │  JWT Payload     │
                   │  • id            │
                   │  • email         │
                   │  • name          │
                   │  • picture       │
                   │  • supabaseToken │ ← Supabase-signed JWT
                   └───────┬──────────┘
                           │
                           ▼
                   Session Callback
                           │
                   ┌───────┴──────────┐
                   │  session.user    │
                   │  • id            │ ← Available in all
                   │  • email         │   server components
                   │  • name          │   and API routes
                   │  • image         │
                   └──────────────────┘
```

### 4.2 Supabase Token

On every sign-in, the NextAuth JWT callback signs a **Supabase-compatible JWT** using `SUPABASE_JWT_SECRET`. This token is attached to the session as `session.supabaseAccessToken` and can be passed to the Supabase JS client on the frontend to make authenticated RLS-gated queries if needed.

### 4.3 Profile Auto-Creation

The `signIn` event callback in `lib/auth/config.ts` fires on every successful sign-in:

```
signIn event fires
       │
       ▼
Check: SELECT id FROM profiles WHERE id = $userId
       │
       ├─ EXISTS → do nothing
       │
       └─ NOT EXISTS → INSERT INTO profiles
                       (id, email, name, avatar_url,
                        subscription_tier='free',
                        sessions_this_month=0)
```

This means a profile row is guaranteed to exist whenever the user reaches the app, without a separate onboarding step.

### 4.4 Email/Password Signup

```
POST /api/auth/signup
       │
       ├─ Validate email + password
       ├─ Check no existing profile with that email
       ├─ bcrypt.hash(password, 12) → password_hash
       ├─ INSERT INTO profiles (id=uuid, email, password_hash, ...)
       └─ Return { success: true }

User is then redirected to /signin to complete login.
```

### 4.5 Supabase Admin Client

`lib/supabase/admin.ts` uses a **lazy-initialized Proxy** pattern:

```
import { supabaseAdmin } from 'lib/supabase/admin'
   │
   │  (no createClient at module load — safe during Next.js build)
   │
   ▼
First call to supabaseAdmin.from(...)
   │
   ▼
Proxy intercepts → createClient(url, SERVICE_ROLE_KEY) once
   │
   ▼
Real Supabase client used for all subsequent calls
```

This avoids build-time failures when `SUPABASE_SERVICE_ROLE_KEY` is not present in the build environment.

---

## 5. Database Schema

All tables use `TEXT` primary keys for `user_id` (matching NextAuth's string IDs) except `practice_sessions` and `feedback_reports` which use UUID primary keys.

### 5.1 Entity Relationship Diagram

```
profiles
──────────────────────────────────────────
PK  id                  TEXT        (NextAuth user ID)
    email               TEXT        UNIQUE NOT NULL
    name                TEXT
    avatar_url          TEXT
    password_hash       TEXT        (null for OAuth users)
    subscription_tier   TEXT        DEFAULT 'free'
    sessions_this_month INT         DEFAULT 0
    month_reset_at      TIMESTAMPTZ
    created_at          TIMESTAMPTZ
    updated_at          TIMESTAMPTZ
         │
         │ 1:N
         ▼
practice_sessions
──────────────────────────────────────────
PK  id                  UUID
FK  user_id             TEXT → profiles.id
    scenario_id         TEXT        (key in SCENARIOS record)
    language            TEXT        DEFAULT 'en'
    status              TEXT        DEFAULT 'active'
    brief               TEXT        (AI-generated scene context)
    user_profile        JSONB       (role, experience, goals)
    turn_count          INT         DEFAULT 0
    created_at          TIMESTAMPTZ
    updated_at          TIMESTAMPTZ
         │
         ├── 1:N
         │    ▼
         │  session_messages
         │  ──────────────────────────────────────────
         │  PK  id          UUID
         │  FK  session_id  UUID → practice_sessions.id
         │  FK  user_id     TEXT → profiles.id
         │      role        TEXT        ('user' | 'assistant')
         │      content     TEXT
         │      created_at  TIMESTAMPTZ
         │
         └── 1:1
              ▼
            feedback_reports
            ──────────────────────────────────────────
            PK  id                UUID
            FK  session_id        UUID → practice_sessions.id  UNIQUE
            FK  user_id           TEXT → profiles.id
                overall_score     INT
                confidence_score  INT
                clarity_score     INT
                relevance_score   INT
                strengths         JSONB   (string[])
                improvements      JSONB   (string[])
                key_moments       JSONB   (object[])
                next_tips         JSONB   (string[])
                summary           TEXT
                created_at        TIMESTAMPTZ
```

### 5.2 Row-Level Security

RLS is enabled on all tables. The general policy pattern:

| Table | Read | Write |
|---|---|---|
| `profiles` | Own row only | Own row only |
| `practice_sessions` | Own sessions only | Own sessions only |
| `session_messages` | Own messages only | Own messages only |
| `feedback_reports` | Own reports only | Own reports only |

API routes use the **service role key** (bypasses RLS) so server-side writes always succeed. The anon key is for potential future client-side reads.

### 5.3 Monthly Session Reset Trigger

A PostgreSQL trigger automatically resets `sessions_this_month` when a new calendar month begins:

```sql
-- Fires BEFORE INSERT on practice_sessions
-- If profiles.month_reset_at < start of current month:
--   SET sessions_this_month = 0
--   SET month_reset_at = NOW()
```

This means the reset is lazy (happens on the user's next session creation) rather than requiring a cron job.

---

## 6. Practice Session Flow

### 6.1 End-to-End Sequence

```
USER                    BROWSER                  API ROUTES             SUPABASE / GEMINI
 │                         │                         │                         │
 │  1. Select scenario      │                         │                         │
 │─────────────────────────►│                         │                         │
 │                         │  2. Open launch dialog   │                         │
 │  3. Choose language &    │                         │                         │
 │     fill optional        │                         │                         │
 │     profile form         │                         │                         │
 │─────────────────────────►│                         │                         │
 │                         │  4. POST /api/sessions/create                      │
 │                         │─────────────────────────►│                         │
 │                         │                         │  5. Check free tier limit│
 │                         │                         │─────────────────────────►│
 │                         │                         │  6. INSERT practice_     │
 │                         │                         │     sessions row         │
 │                         │                         │─────────────────────────►│
 │                         │  7. Return sessionId    │                         │
 │                         │◄─────────────────────────│                         │
 │                         │  8. Navigate to          │                         │
 │                         │  /practice/[sessionId]   │                         │
 │                         │                         │                         │
 │                         │  9. PracticeRoom mounts  │                         │
 │                         │     Phase: INTRO         │                         │
 │                         │                         │                         │
 │                         │  10. POST /api/ai/practice (no userMessage)        │
 │                         │─────────────────────────►│                         │
 │                         │                         │  11. Build system prompt │
 │                         │                         │  12. POST Gemini API     │
 │                         │                         │─────────────────────────►│
 │                         │                         │  13. Ada's opening line  │
 │                         │                         │◄─────────────────────────│
 │                         │                         │  14. INSERT assistant    │
 │                         │                         │     message to DB        │
 │                         │  15. Display opening    │                         │
 │                         │◄─────────────────────────│                         │
 │                         │     Phase: ACTIVE        │                         │
 │  16. User types reply    │                         │                         │
 │─────────────────────────►│                         │                         │
 │                         │  17. POST /api/ai/practice (userMessage + history) │
 │                         │─────────────────────────►│                         │
 │                         │                         │  18. Rate limit check    │
 │                         │                         │  19. Fetch last messages │
 │                         │                         │─────────────────────────►│
 │                         │                         │  20. POST Gemini API     │
 │                         │                         │─────────────────────────►│
 │                         │                         │  21. Ada's response      │
 │                         │                         │◄─────────────────────────│
 │                         │                         │  22. INSERT both msgs    │
 │                         │  23. Display Ada's reply │                         │
 │                         │◄─────────────────────────│                         │
 │                         │  ... (repeat 16-23)      │                         │
 │                         │                         │                         │
 │  24. Click "End Session" │                         │                         │
 │─────────────────────────►│                         │                         │
 │                         │     Phase: ENDING        │                         │
 │                         │  25. POST /api/ai/feedback                         │
 │                         │─────────────────────────►│                         │
 │                         │                         │  26. Fetch all messages  │
 │                         │                         │─────────────────────────►│
 │                         │                         │  27. POST Gemini (eval)  │
 │                         │                         │─────────────────────────►│
 │                         │                         │  28. JSON feedback       │
 │                         │                         │◄─────────────────────────│
 │                         │                         │  29. INSERT feedback_    │
 │                         │                         │     reports + update     │
 │                         │                         │     session status       │
 │                         │  30. Display FeedbackReport                        │
 │                         │◄─────────────────────────│                         │
 │                         │     Phase: FEEDBACK      │                         │
```

### 6.2 PracticeRoom Phase State Machine

```
                    ┌──────────┐
           mount ──►│  INTRO   │
                    └────┬─────┘
                         │ Ada's opening line received
                         ▼
                    ┌──────────┐
                    │  ACTIVE  │◄─────┐
                    └────┬─────┘      │ user sends message
                         │            │ Ada replies
                         │ max turns reached
                         │ OR user clicks End
                         ▼
                    ┌──────────┐
                    │  ENDING  │
                    └────┬─────┘
                         │ feedback API returns
                         ▼
                    ┌──────────┐
                    │ FEEDBACK │
                    └──────────┘
```

### 6.3 Confidence Score Heuristic

The UI calculates a **real-time confidence score** client-side without an AI call. It's a heuristic based on message characteristics:

```
Base score: 50

+ message length > 100 chars    → +10
+ message length > 200 chars    → +10  (additional)
+ contains specific numbers     → +5   (e.g. "3 years", "20%")
+ contains structured keywords  → +5   (e.g. "first", "secondly")
+ avoids filler words           → +5   (no "um", "uh", "like")
+ ends with question to Ada     → +5   (shows engagement)

Capped at 0–100
Displayed as an animated ring in the UI
```

---

## 7. Scenario System

All scenarios are defined in a single file: `lib/scenarios.ts`. No database rows, no CMS — the record is the source of truth.

### 7.1 Scenario Structure

```typescript
type Scenario = {
  id: string
  title: string
  icon: string                          // emoji
  description: string
  category: 'career' | 'workplace' | 'freelance'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  proOnly: boolean
  persona: string                       // Ada's character description
  openingLine: Record<Language, string> // keyed by 'en' | 'ha' | 'yo' | 'ig'
  evaluationFocus: string[]             // criteria fed to feedback prompt
  tips: string[]                        // shown in launch dialog
  maxTurns: number                      // max back-and-forth exchanges
}
```

### 7.2 Bundled Scenarios

| ID | Title | Difficulty | Tier | Category |
|---|---|---|---|---|
| `tech_interview` | Tech Interview Practice | Intermediate | Free | Career |
| `salary_negotiation` | Salary Negotiation | Advanced | Free | Workplace |
| `client_pitch` | Client Pitch | Intermediate | Free | Freelance |
| `promotion_request` | Promotion Request | Advanced | **Pro** | Workplace |
| `networking` | Networking Conversation | Beginner | Free | Career |
| `difficult_conversation` | Difficult Workplace Conversation | Advanced | **Pro** | Workplace |

### 7.3 Adding a New Scenario

Add one entry to the `SCENARIOS` record in `lib/scenarios.ts`. No migrations, no other changes:

```typescript
// lib/scenarios.ts
export const SCENARIOS: Record<string, Scenario> = {
  // ... existing scenarios ...

  my_new_scenario: {
    id: 'my_new_scenario',
    title: 'Board Presentation',
    icon: '📊',
    description: 'Present a business case to a skeptical board',
    category: 'career',
    difficulty: 'advanced',
    proOnly: true,
    persona: 'You are a board member at a Nigerian fintech startup...',
    openingLine: {
      en: "Good morning. You have 10 minutes. Please begin.",
      ha: "Assalamu alaikum. Kuna mintuna goma. Da fatan za ku fara.",
      yo: "Ẹ káàárọ̀. O ní ìṣẹ́jú mẹ́wàá. Jọwọ bẹ̀rẹ̀.",
      ig: "Ụtụtụ ọma. Ị nwere nkeji iri. Biko malite.",
    },
    evaluationFocus: [
      'clarity of business case',
      'confidence under pressure',
      'handling of challenging questions',
    ],
    tips: ['Lead with the ask', 'Use data to support every claim'],
    maxTurns: 12,
  },
}
```

---

## 8. API Reference

### 8.1 Authentication

All API routes (except `/api/auth/*` and `/api/auth/signup`) require a valid NextAuth session cookie. Unauthenticated requests return `401`.

### 8.2 POST /api/sessions/create

Creates a new practice session.

**Request body:**
```json
{
  "scenarioId": "tech_interview",
  "language": "en",
  "userProfile": {
    "currentRole": "Junior Developer",
    "yearsExperience": 2,
    "targetRole": "Mid-level Backend Engineer"
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid-v4"
}
```

**Logic:**
1. Checks free tier: if `subscription_tier === 'free'` and `sessions_this_month >= 3` → `403`
2. Increments `sessions_this_month`
3. Creates `practice_sessions` row
4. Returns session ID for redirect to `/practice/[sessionId]`

### 8.3 POST /api/ai/practice

Sends a message and gets Ada's reply.

**Request body:**
```json
{
  "sessionId": "uuid-v4",
  "scenarioId": "tech_interview",
  "language": "en",
  "userMessage": "I've been working in backend development for 3 years...",
  "userProfile": { ... }
}
```

When `userMessage` is `null` or omitted, the endpoint generates Ada's **opening line** only.

**Response:**
```json
{
  "response": "That's a strong foundation. Tell me about a time you had to debug a production issue under pressure. What was your process?",
  "turnCount": 3
}
```

**Error codes:**
- `401` — not authenticated
- `403` — session does not belong to user
- `429` — rate limit exceeded (60 msgs/hour)
- `500` — Gemini API error

### 8.4 POST /api/ai/feedback

Generates the post-session feedback report.

**Request body:**
```json
{
  "sessionId": "uuid-v4",
  "scenarioId": "tech_interview"
}
```

**Response:** Full feedback JSON (see [section 3.4](#34-feedback-generation))

**Side effects:**
- Sets `practice_sessions.status = 'completed'`
- Inserts row into `feedback_reports`

### 8.5 POST /api/ai/brief

Generates a session briefing paragraph before the session starts (optional, triggered from launch dialog).

**Request body:**
```json
{
  "scenarioId": "salary_negotiation",
  "userProfile": {
    "currentRole": "QA Engineer",
    "yearsExperience": 4,
    "specificGoals": "I want to negotiate a 30% raise"
  }
}
```

**Response:**
```json
{
  "brief": "You're about to meet your engineering manager, Adaeze, for your annual review. You've just received a competing offer from a Lagos startup at 30% above your current salary and you plan to use it as leverage. Adaeze is known for being fair but budget-conscious."
}
```

### 8.6 POST /api/auth/signup

Registers a new user with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Fatima Bello"
}
```

**Response:**
```json
{ "success": true }
```

---

## 9. Component Architecture

### 9.1 Component Tree (Practice Flow)

```
app/(main)/practice/[sessionId]/page.tsx
└── PracticeRoom                     ← components/practice/practice-room.tsx
    │
    ├── Phase: INTRO
    │   └── Loading spinner + "Ada is warming up..."
    │
    ├── Phase: ACTIVE
    │   ├── SessionHeader
    │   │   ├── Scenario title + turn counter
    │   │   └── End Session button
    │   │
    │   ├── MessageList
    │   │   ├── UserMessage (right-aligned)
    │   │   └── AssistantMessage (left-aligned, Ada avatar)
    │   │
    │   ├── ConfidenceRing          ← live heuristic score
    │   │
    │   ├── TipsAccordion           ← scenario.tips
    │   │
    │   └── InputArea
    │       ├── TextArea
    │       ├── VoiceInputButton    ← Web Speech API
    │       └── SendButton
    │
    ├── Phase: ENDING
    │   └── "Generating your feedback..." animation
    │
    └── Phase: FEEDBACK
        └── FeedbackReport          ← components/practice/feedback-report.tsx
            ├── OverallScoreRing    ← animated count-up
            ├── SubScoreRings (3)   ← confidence, clarity, relevance
            ├── RatingBadge         ← Excellent / Solid / Keep Going / Train Harder
            ├── StrengthsList
            ├── ImprovementsList
            ├── KeyMomentsList
            ├── NextTipsList
            └── ActionButtons       ← New Session | Dashboard
```

### 9.2 Scenario Selection Flow

```
app/(main)/practice/page.tsx
└── ScenarioGrid                     ← components/practice/scenario-grid.tsx
    ├── ScenarioCard (×N)
    │   ├── Icon, title, difficulty badge
    │   ├── Lock icon (if proOnly && tier=free)
    │   └── onClick → open LaunchDialog
    │
    └── LaunchDialog (radix Dialog)
        ├── Scenario summary
        ├── TipsAccordion
        ├── LanguageSelector         ← en | ha | yo | ig
        ├── SessionSetupForm (optional)
        │   └── components/practice/session-setup.tsx
        │       ├── Current role input
        │       ├── Years of experience input
        │       └── Goals textarea
        └── "Start Mission" button
            └── POST /api/sessions/create → navigate
```

### 9.3 Voice Features

| Feature | Implementation | Limitation |
|---|---|---|
| Voice Input | Web Speech API (`SpeechRecognition`) | English only (browser API limitation) |
| Voice Output (TTS) | Web Speech Synthesis API | Device voice list varies by OS |
| Voice selection | Lists available voices, filters by `lang` | No guarantee of specific voice |

Both are implemented as custom hooks:
- `components/practice/hooks/use-voice-input.ts`
- `components/practice/hooks/use-voice-output.ts`

---

## 10. Monetization & Access Control

### 10.1 Tier Comparison

| Feature | Free | Pro |
|---|---|---|
| Sessions per month | 3 | Unlimited |
| Beginner scenarios | ✓ | ✓ |
| Intermediate scenarios | ✓ | ✓ |
| Advanced scenarios (basic) | ✓ | ✓ |
| Pro-only scenarios | ✗ | ✓ |
| Feedback reports | ✓ | ✓ |

`FREE_SESSIONS_PER_MONTH = 3` is defined as a constant in `lib/scenarios.ts` — change there to adjust the limit globally.

### 10.2 Enforcement Points

```
1. ScenarioGrid (client-side)
   → Lock icon shown on proOnly cards when user.tier === 'free'
   → Click blocked with upgrade prompt

2. /api/sessions/create (server-side)
   → Counts sessions_this_month for free tier users
   → Returns 403 with { error: 'limit_reached' } if at limit

3. The session create check is authoritative.
   Client-side lock is UX only, not a security boundary.
```

### 10.3 Upgrading a User to Pro

Currently manual — set `profiles.subscription_tier = 'pro'` in Supabase dashboard or via a future payment webhook. No automated upgrade flow exists yet.

---

## 11. Multilingual System

Ada can conduct full practice sessions in **four languages**:

| Code | Language |
|---|---|
| `en` | English |
| `ha` | Hausa |
| `yo` | Yoruba |
| `ig` | Igbo |

### 11.1 How Language Flows Through the System

```
User selects language in LaunchDialog
         │
         ▼
Stored as query param: /practice/[sessionId]?scenario=X&lang=yo
         │
         ▼
PracticeRoom reads lang from URL params
         │
         ├── Initial message request: POST /api/ai/practice { language: 'yo' }
         │           │
         │           ▼
         │   scenario.openingLine['yo'] used as Ada's first message
         │   (hardcoded, no Gemini call for the first turn)
         │
         └── All subsequent requests: { language: 'yo' }
                     │
                     ▼
             System prompt layer 3:
             "Respond ONLY in Yoruba..."
                     │
                     ▼
             Gemini responds in Yoruba
```

### 11.2 Opening Lines Architecture

The first message Ada sends is **not AI-generated** — it's pulled directly from `scenario.openingLine[language]`. This ensures:
- Zero latency for the opening (no Gemini round-trip)
- Culturally reviewed, consistent first impressions
- No risk of Gemini defaulting to English

All subsequent turns rely on the language instruction in the system prompt.

---

## 12. Environment Variables

Copy `.env.example` to `.env.local` for local development.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role (server only, bypasses RLS) |
| `SUPABASE_JWT_SECRET` | Yes | Signs Supabase-compatible JWTs for session tokens |
| `NEXTAUTH_SECRET` | Yes | Signs NextAuth JWTs (generate: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | App base URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Override Gemini model (default: `gemini-2.0-flash-lite`) |

### Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the client. It's only used in API routes.
- `GEMINI_API_KEY` is split on whitespace before use to guard against Cloud Run environment variable corruption (trailing newlines).
- `NEXTAUTH_SECRET` should be at least 32 bytes of random data.

---

## 13. Directory Structure

```
g3-practice-room/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (fonts, session provider)
│   ├── page.tsx                      # Landing page (/)
│   │
│   ├── (auth)/                       # Unauthenticated route group
│   │   ├── layout.tsx
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── (main)/                       # Authenticated route group
│   │   ├── layout.tsx                # Navbar + auth guard
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── practice/
│   │   │   ├── page.tsx              # ScenarioGrid
│   │   │   ├── loading.tsx
│   │   │   └── [sessionId]/page.tsx  # PracticeRoom
│   │   ├── history/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── profile/
│   │       ├── page.tsx
│   │       └── loading.tsx
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts  # NextAuth handler
│       │   └── signup/route.ts         # Email signup
│       ├── ai/
│       │   ├── practice/route.ts       # Main conversation AI
│       │   ├── feedback/route.ts       # Post-session evaluation
│       │   └── brief/route.ts          # Pre-session briefing
│       └── sessions/
│           ├── create/route.ts         # Session creation + tier check
│           └── [sessionId]/route.ts    # Session fetch
│
├── components/
│   ├── ui/                           # Shared primitives (Radix-based)
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── avatar.tsx
│   │   └── separator.tsx
│   ├── layout/
│   │   └── navbar.tsx
│   ├── providers/
│   │   └── session-provider.tsx      # NextAuth SessionProvider wrapper
│   ├── practice/
│   │   ├── practice-room.tsx         # Core conversation UI
│   │   ├── feedback-report.tsx       # Score visualization
│   │   ├── scenario-grid.tsx         # Scenario selection + launch dialog
│   │   ├── session-setup.tsx         # Optional profile form
│   │   └── hooks/
│   │       ├── use-voice-input.ts    # Web Speech API input
│   │       └── use-voice-output.ts   # TTS output
│   └── history/
│       └── session-card.tsx
│
├── lib/
│   ├── scenarios.ts                  # All scenario definitions
│   ├── utils.ts                      # Shared utilities (cn, etc.)
│   ├── rate-limit.ts                 # Rate limit helper
│   ├── auth/
│   │   └── config.ts                 # NextAuth configuration
│   └── supabase/
│       ├── schema.sql                # Canonical DB schema
│       ├── admin.ts                  # Service role client (lazy proxy)
│       ├── client.ts                 # Browser client
│       └── server.ts                 # Server-side client
│
├── types/
│   └── next-auth.d.ts                # Session type extensions
│
├── CLAUDE.md                         # AI coding assistant instructions
├── DOCUMENTATION.md                  # This file
├── .env.example                      # Environment variable template
├── package.json
└── tsconfig.json
```

---

*Last updated: June 2026. Maintained by the G3Women Engineering team.*
