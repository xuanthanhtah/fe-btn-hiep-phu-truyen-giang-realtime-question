# Implementation Plan: Real-Time ABCD Audience Polling Web App

## 1. Executive Summary & Product Vision
This project is a high-performance, real-time ABCD audience polling web application inspired by live stage polling tools (e.g. Mentimeter), built for 30–100 participants per room.
- **Presenter Experience**: Desktop/projector-first, sleek dark stage aesthetic, large typography, real-time animated percentage bars, full question and voting control.
- **Participant Experience**: Mobile-first, responsive, zero-friction (no accounts, no names, no database), instant tap feedback, authoritative host vote acknowledgment.
- **Transport**: Supabase Realtime Broadcast over client-side in-memory state.
- **No Persistence / No Backend**: Zero database tables, zero backend servers, zero browser storage (no `localStorage`, `sessionStorage`, `IndexedDB`). State resides exclusively in the host's client memory for the duration of the presentation.

---

## 2. Technical Risks & Mitigations

### 2.1 Host Authority in In-Memory Architecture
- **Risk**: The host's browser holds the single source of truth. If the host refreshes or closes the tab, all questions, votes, and room state are lost.
- **Mitigation**:
  - Implement a `beforeunload` warning modal/prompt on the host interface.
  - Implement an optional manual JSON export/import for question templates (strictly in-memory, clearly explaining that imports load questions without resurrecting votes or old sessions).
  - Explicit UI disclaimers detailing the ephemeral nature of the session.

### 2.2 Client-Side Authority & Public Broadcast Security
- **Risk**: Public Supabase Realtime channels can theoretically receive forged broadcast events from malicious actors on the same channel.
- **Mitigation**:
  - Host strictly isolates itself: it ignores control commands (such as `poll:opened`, `poll:closed`, `question:changed`, `room:reset`) arriving over the network; host state changes ONLY via direct local UI interactions.
  - Strict Zod validation on every incoming event payload.
  - Host filters votes: rejects votes matching invalid room IDs, non-active question IDs, closed poll statuses, or invalid option IDs (`A`, `B`, `C`, `D`).
  - Rate limiting / deduplication on incoming `vote:cast` and `room:sync_request` events to avoid broadcast storms and CPU spikes.
  - Full documentation in `README.md` explaining that production enterprise deployments requiring tamper-proof voting must use authenticated server-side validation or private channels.

### 2.3 Reconnection, Out-of-Order Delivery & Race Conditions
- **Race Condition A (Vote cast at closing)**: A participant casts a vote just as the host closes the poll.
  - *Resolution*: Host checks `pollStatus === 'open'` when processing `vote:cast`. If closed, the vote is discarded/rejected; participant pending state times out or clears upon receiving `poll:closed`.
- **Race Condition B (Question change)**: A vote arrives with an older `questionId`.
  - *Resolution*: Host validates `event.questionId === currentQuestion.id`. If mismatched, vote is discarded.
- **Race Condition C (Duplicate event delivery)**: Network delivers duplicate packets.
  - *Resolution*: Deduplicate using unique `eventId` tracking with an LRU cache or ring buffer of recent event IDs.
- **Race Condition D (Participant joins or reconnects late)**: Participant connects after initial snapshot was broadcast.
  - *Resolution*: Participant subscribes to `poll:<roomId>` and sends a `room:sync_request`. Host responds with a debounced `room:state` snapshot.

---

## 3. Architecture & Module Design

### 3.1 Domain Models (`src/types/poll.ts`)
```ts
export type OptionId = 'A' | 'B' | 'C' | 'D';
export type PollStatus = 'waiting' | 'open' | 'closed';

export interface PollOption {
  id: OptionId;
  text: string;
}

export interface PollQuestion {
  id: string;
  title: string;
  options: [PollOption, PollOption, PollOption, PollOption];
}

export interface VoteCounts {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface PublicRoomState {
  roomId: string;
  revision: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PollQuestion | null;
  pollStatus: PollStatus;
  voteCounts: VoteCounts;
  totalAcceptedVotes: number;
}
```

### 3.2 Real-time Communication Layer (`src/realtime/`)
- `supabase.client.ts`: Supabase client initialization with graceful environment variable validation.
- `room.protocol.ts`: Zod schemas and TypeScript event types for versioned payloads:
  - `room:state`: Host -> Public broadcast snapshot.
  - `poll:opened`: Host -> Public broadcast.
  - `poll:closed`: Host -> Public broadcast.
  - `question:changed`: Host -> Public broadcast.
  - `vote:cast`: Participant -> Host.
  - `vote:accepted`: Host -> Public broadcast with updated counts and participant acknowledgment.
  - `room:reset`: Host -> Public broadcast.
  - `room:sync_request`: Participant -> Host broadcast requesting fresh snapshot.
- `room.events.ts`: Event creator helpers and payload validators.
- `room.reducer.ts`: Pure state transition functions (vote calculation, percentage derivation, question switching).
- `room.channel.ts`: Supabase Realtime Broadcast channel manager with lifecycle tracking (connecting, connected, reconnecting, disconnected).

### 3.3 State Management (`src/stores/`)
- `host.store.ts`: Host in-memory state: questions, active question index, poll status, participant vote map (`Record<participantId, OptionId>`), revision counter.
- `participant.store.ts`: Participant in-memory state: assigned UUID, current question, selected option, pending option, accepted option, connection status.
- `presenter.store.ts`: Presenter in-memory view of the public room snapshot.
- `connection.store.ts`: Real-time transport status (`connecting`, `connected`, `reconnecting`, `disconnected`, `unavailable`).

---

## 4. Application Routes & Visual Design
- **`/` (Landing Page)**: Hero section, quick room creator, presentation guide, join-by-code input.
- **`/host/:roomId`**: Live host control cockpit. Add/edit/reorder questions, open/close voting, live vote tally, QR display, fullscreen trigger, reset session warning dialog, JSON import/export.
- **`/present/:roomId`**: High-impact stage view. Massive 2x2 or 4-row option cards with smooth animated percentage bars, live vote counter, status badge (WAITING / VOTING OPEN / VOTING CLOSED), joining banner with QR code.
- **`/join/:roomId`**: Mobile-optimized voting keypad. Instant tactile visual feedback, pending/accepted confirmation indicators, auto-reset on question transition.

**Design System & Aesthetics**:
- Theme: Ultra-modern dark stage theme (`#090D16`, `#0F172A`, `#1E293B`).
- High-contrast typography with Inter/system font stack.
- Option Palette:
  - Option A: Coral / Crimson (`#EF4444` / `#F87171`)
  - Option B: Electric Blue (`#3B82F6` / `#60A5FA`)
  - Option C: Amber Gold (`#F59E0B` / `#FBBF24`)
  - Option D: Emerald Green (`#10B981` / `#34D399`)

---

## 5. Testing & Verification Plan

### 5.1 Unit Tests (`src/test/unit/`)
- Pure vote counting logic and edge cases (0 votes, 100 votes, replace vote).
- Safe percentage calculations (ensuring 0% when 0 votes, no `NaN` or divide-by-zero).
- Vote rejection rules (poll closed, wrong question ID, invalid option).
- Zod schema validation (rejecting malformed events, validating valid events).
- Deduplication of incoming `eventId`.

### 5.2 Integration Tests (`src/test/integration/`)
- Mock Supabase Realtime Broadcast channel.
- Complete room lifecycle:
  1. Host initializes room with 2 questions.
  2. Participant connects and requests sync.
  3. Host opens voting.
  4. Participant casts vote for "B".
  5. Host processes vote, broadcasts `vote:accepted`, counts update to 1 (100% for B).
  6. Participant changes vote to "A" -> counts update to 1 (100% for A).
  7. Host closes voting -> next vote rejected.
  8. Host advances to next question -> votes reset to 0, participant state resets.

### 5.3 Manual Verification
- Multi-window testing (Host, Presenter, 2+ Participants) via browser automation or parallel tabs.
- QR code scanning and join URL verification.
- Offline/reconnection simulation.
- Production build validation (`npm run build`).

---

## 6. Execution Phases
1. **Scaffold & Dependencies**: React 19 + TypeScript + Vite + Tailwind + Zustand + Supabase + Lucide + QR + Zod + Vitest.
2. **Core Domain & Reducers**: Type definitions, Zod schemas, pure reducer functions, unit tests.
3. **Zustand Stores & Transport Layer**: Channel abstraction, event dispatchers, mockable transport.
4. **UI Components & Pages**: Landing, Host Dashboard, Stage Presenter Screen, Mobile Participant Page.
5. **Real-time Wiring & Error Boundaries**: Supabase client integration, connection indicator, edge-case guards.
6. **Automated Testing & Build Verification**: Vitest unit/integration suites, TypeScript check, Oxlint/ESLint check, Vite production bundle build.
7. **Documentation**: Comprehensive `README.md` and `.env.example`.
