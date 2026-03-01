# InterviewIQ
https://interviewiq-sage.vercel.app/

## Project Overview

InterviewIQ is an AI-powered web application that simulates adaptive
mock interviews with voice support and long-term progression tracking.

Users enter their target job type and job description once at the start
of a session. The system then generates tailored interview questions
organized by relevant categories (for example, data structures for
software engineering roles or revenue and cost analysis for consulting
roles).

InterviewIQ adapts dynamically based on user performance:

-   If a response receives a score **≥ 7.5**, the user advances and the
    category is marked complete.
-   If a response receives a score **\< 7.5**, the system repeats the
    same category with an easier question to reinforce weak areas.

The platform supports optional interviewer voice output using
ElevenLabs, real-time scoring, and a progress tracking system that
monitors category completion and long-term improvement across
interviews.

------------------------------------------------------------------------

## Features

-   Adaptive category-based question system
-   Intelligent retry logic for weak categories
-   Category completion tracking
-   Voice input via speech-to-text
-   Optional interviewer voice output using ElevenLabs Text-to-Speech
-   Real-time scoring with relaxed grading
-   Progress dashboard displaying:
    -   Overall average score
    -   Completed categories
    -   In-progress categories
-   Cross-interview comparison feedback using long-term memory
-   Personalized questions using the user's name

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   **React** --- User interface and interview session flow
-   **TypeScript** --- Type safety and maintainability
-   **CSS Modules** --- Component-scoped styling

### Backend

-   **Next.js API Routes** --- Server-side logic and endpoints
-   **OpenAI API** --- Question generation, evaluation, scoring, and
    report writing
-   **Supermemory API** --- Long-term memory for cross-interview
    comparisons and adaptive behavior
-   **ElevenLabs API** --- Text-to-Speech using Adam (Humorous
    Interviewer), model `eleven_turbo_v2`

### Voice

-   **OpenAI Whisper** --- Speech-to-text transcription
-   **ElevenLabs Text-to-Speech** --- Interviewer voice output

### State Management

-   **In-memory session data** --- Live statistics during active
    interviews
-   **Supermemory** --- Persistent historical interview storage

------------------------------------------------------------------------

## How the Adaptive System Works

1.  At the start of an interview, the system selects a random category
    relevant to the chosen role.
2.  The user answers the generated question and receives a score.
3.  Based on performance:
    -   **Score ≥ 7.5** → Category is marked as completed and the system
        moves forward.
    -   **Score \< 7.5** → The same category is repeated with a slightly
        easier question.
4.  Categories are tracked throughout the interview lifecycle.
5.  Supermemory stores past performance and enables future reports to
    reference:
    -   Improvements over time
    -   Repeated weaknesses
    -   Cross-interview comparisons

------------------------------------------------------------------------`

## Architecture Overview

### Frontend

-   **Session Page** manages:
    -   Interview flow
    -   Voice input handling
    -   Real-time scoring display
    -   Progress dashboard

### Backend API Routes

-   **Create Session** --- Initializes interview state and selects the
    starting category
-   **Answer Question** --- Evaluates responses and determines next
    step
-   **End Session** --- Finalizes interview data
-   **Generate Report** --- Produces performance summary and feedback

### Adaptive Category Logic

The backend maintains category state per session and applies score-based
progression rules to determine whether to advance or repeat a category
with adjusted difficulty.

### Memory Integration

Supermemory stores historical interview data and is queried during
report generation to provide cross-interview insights and personalized
feedback.

------------------------------------------------------------------------

## Future Improvements

-   Enhanced analytics dashboard
-   Streaming Text-to-Speech support
-   Real-time difficulty scaling
-   Interview mode presets (e.g., behavioral-only, technical-only)
-   Expanded role-specific category libraries

------------------------------------------------------------------------