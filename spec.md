# SUB PREMIUM

## Current State
The AI Assistant (`AIAssistant.tsx`) uses a large hardcoded pattern-matching function (`generateGlobalAIReply`) that returns static string answers for known questions. It handles greetings, world leaders, capitals, science, creator tools, etc. All responses are pre-written — no real external data is fetched.

## Requested Changes (Diff)

### Add
- Real web knowledge lookup using the DuckDuckGo Instant Answer API (`https://api.duckduckgo.com/?q=<query>&format=json&no_html=1&skip_disambig=1`) — CORS-compatible, no auth needed
- Wikipedia summary fallback via `https://en.wikipedia.org/api/rest_v1/page/summary/<term>` for factual entity questions
- `searchGlobalKnowledge(query)` async function that:
  1. Tries DuckDuckGo Instant Answer API
  2. Falls back to Wikipedia summary if DDG returns nothing
  3. Falls back to curated local knowledge for creator tools
  4. Returns "I couldn't find reliable information for that question." if all fail
- Typing indicator shown while fetching (already exists, just needs wiring to async path)
- Query classifier to route: `isCreatorQuestion` → local tools, else → live API search

### Modify
- `handleSend` / message submission flow: make it async, call `searchGlobalKnowledge`, await result, then append AI message
- Keep all existing creator tool responses (video ideas, titles, hashtags, etc.) intact — routed locally without API call
- Keep chat bubble UI, dark theme, typing indicator, quick suggestions — no visual changes

### Remove
- The giant hardcoded `generateGlobalAIReply` function for world-knowledge questions (creator tool section stays)

## Implementation Plan
1. Add `searchDuckDuckGo(query)` — fetch DDG Instant Answer, extract `AbstractText` or `Answer`
2. Add `searchWikipedia(query)` — fetch Wikipedia summary for the most likely entity in the query
3. Add `isCreatorQuery(query)` classifier — returns true for video/content/hashtag/creator questions
4. Add `getGlobalAnswer(query)` orchestrator — tries DDG → Wikipedia → "couldn't find" fallback
5. Replace `generateGlobalAIReply` call with async `getGlobalAnswer` in the send handler
6. Keep existing creator tool local responses unchanged
7. Wire typing indicator to show during async fetch
