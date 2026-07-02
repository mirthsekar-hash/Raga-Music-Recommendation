# Project: Raga – AI Discovery Companion + Cultural Discovery Layer

## Background

Spotify has one of the world's most sophisticated recommendation systems. However, user research and review analysis reveal that many users still struggle with meaningful music discovery.

Users frequently report:

* Recommendations feel repetitive.
* The same artists appear repeatedly.
* Hidden gems and emerging artists are difficult to discover.
* Music discovery often happens outside Spotify (YouTube, Instagram, Reddit, communities).
* Users want guidance and confidence before exploring unfamiliar music.

The target segment is **Discovery-Oriented Music Explorers**.

These users actively seek new artists, genres, and hidden gems but often leave Spotify to discover music elsewhere.

---

# Problem Statement

Discovery-Oriented Music Explorers actively want to discover new artists, genres, and hidden gems, but Spotify's recommendation system primarily optimizes for familiarity and engagement rather than meaningful exploration.

As a result:

* Discovery feels repetitive.
* Users remain trapped in familiar listening patterns.
* Hidden gems are rarely surfaced.
* Emerging artists struggle to gain visibility.
* Users rely on external platforms for discovery.

Research further revealed that users need:

* Context
* Guidance
* Confidence
* Explainability

before they are willing to explore unfamiliar music.

---

# Solution

Build an AI-powered music discovery experience called:

## Raga

Raga combines:

### 1. AI Discovery Companion

An AI assistant that understands:

* User intent
* Mood
* Activity
* Listening context
* Discovery goals

and provides personalized music recommendations through conversational interactions.

### 2. Cultural Discovery Layer

A recommendation enrichment layer that surfaces:

* Emerging artists
* Hidden gems
* Niche genres
* Community-discovered music
* Reddit-trending music
* Non-mainstream recommendations

The objective is to help users discover music they are likely to enjoy but unlikely to discover on their own.

---

# Goal of the MVP

Demonstrate that AI-guided discovery combined with cultural discovery signals can improve meaningful music discovery.

This is a Product Management case-study MVP.

The MVP does not need Spotify production-level recommendation quality.

The MVP should demonstrate the concept convincingly.

---

# User Journey

### Step 1

User opens Raga.

---

### Step 2

User enters a natural language request.

Examples:

* Recommend music for a late-night drive.
* Suggest underrated indie artists.
* Give me hidden gems similar to Coldplay.
* I want something energetic for a workout.
* Recommend songs trending in indie communities.

---

### Step 3

AI extracts:

* Mood
* Activity
* Genre
* Intent
* Exploration level

---

### Step 4

System generates recommendations using:

### Personalization Signals

* User taste profile
* Preferred genres
* Favorite artists

### Cultural Discovery Signals

* Hidden gems
* Emerging artists
* Community trends
* Reddit-inspired discovery signals

Suggested weighting:

70% Personal Taste Match

30% Cultural Discovery Signal

---

### Step 5

Display recommendations.

Each recommendation must include:

### Song Name

### Artist

### Why You'll Like It

Example:

"You frequently listen to cinematic electronic music."

### Why It's Interesting

Example:

"This artist is gaining popularity in indie music communities but has not yet entered mainstream playlists."

---

### Step 6

User can provide feedback:

* Love It
* Skip
* More Like This

---

# Required Screens

## Screen 1

Landing Page

Includes:

* Product branding (Raga)
* Discovery search box
* Suggested prompts

---

## Screen 2

AI Discovery Chat Interface

Conversational experience.

ChatGPT-style UI.

---

## Screen 3

Recommendation Results

Recommendation cards with:

* Album art
* Artist
* Song
* Discovery explanation

---

## Screen 4

Recommendation Detail View

Shows:

* Recommendation rationale
* Discovery source
* Similar artists
* Exploration path

---

## Screen 5

Feedback Experience

Allows users to refine recommendations.

---

# Technology Stack

Frontend:

* Next.js
* React
* TypeScript
* Tailwind CSS

Backend:

* Next.js API routes

Database:

* Supabase

LLM:

* Google Gemini API (preferred)

Vector Search:

* Optional

Deployment:

* Vercel

---

# MVP Data Strategy

Since Spotify APIs may not provide all required functionality, create a sample music dataset.

Dataset fields:

* Song Name
* Artist
* Genre
* Mood
* Popularity
* Emerging Artist Flag
* Hidden Gem Flag
* Community Buzz Score

Store in Supabase.

The system should query this dataset and use Gemini to generate explanations and discovery narratives.

---

# UI Requirements

Design should feel:

* Premium
* Modern
* Spotify-inspired
* AI-native

Use:

* Dark theme
* Spotify green accents
* Clean card layouts
* Mobile-first responsive design

---

# Expected Deliverables

Build a working MVP that demonstrates:

1. Conversational music discovery.
2. Intent-aware recommendations.
3. Hidden gem recommendations.
4. Emerging artist discovery.
5. Recommendation explanations.
6. Feedback loop.
7. Modern production-quality UI.

The final application should be deployable to Vercel and usable through a public URL.
