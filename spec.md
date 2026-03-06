# SUB PREMIUM — Global AI Assistant Upgrade

## Current State

The AI Assistant (`AIAssistant.tsx`) is a floating chat panel with a fixed-response engine (`generateSmartReply`). It only handles creator-tool queries (video ideas, titles, descriptions, tags) via hardcoded keyword matching. Any unrecognized query falls back to a generic message telling the user to ask creator questions. It does NOT answer general knowledge questions (geography, history, science, world leaders, etc.).

The `AISearchBar.tsx` also uses a fixed `generateAiAnswer` function limited to SUB PREMIUM content queries.

## Requested Changes (Diff)

### Add
- A `generateGlobalAIReply` function in `AIAssistant.tsx` that handles broad knowledge domains: geography (capitals, countries), history, science, technology, world leaders/politics, culture, education, entertainment, and general Q&A.
- Expanded quick suggestions including global knowledge examples alongside creator tools.
- Updated welcome message mentioning global knowledge capability.
- Natural-language answer generation for world-knowledge questions using comprehensive built-in knowledge matching (no external API needed — comprehensive local knowledge base).

### Modify
- `generateSmartReply` → replace with `generateGlobalAIReply` that first checks creator-tool intents, then handles global knowledge topics, and returns a well-formed informative answer for any general knowledge question instead of a fallback asking the user to ask creator questions.
- Welcome message updated to mention global knowledge + creator tools.
- Quick suggestions updated to include world knowledge examples.
- Input placeholder updated to "Ask me anything...".

### Remove
- The old narrow fallback message that says "I can only help with video ideas, titles, etc." — replaced with actual informative answers.

## Implementation Plan

1. Replace `generateSmartReply` in `AIAssistant.tsx` with `generateGlobalAIReply` covering:
   - Creator tools (video ideas, titles, descriptions, tags, playlists — preserve existing)
   - World leaders / presidents / prime ministers
   - Countries and capitals
   - Geography (mountains, rivers, oceans, landmarks, tallest buildings)
   - History (major events, inventions, historical figures)
   - Science (AI definition, physics concepts, biology basics)
   - Technology (internet history, coding, devices)
   - Entertainment (movies, music, celebrities)
   - Math / general facts
   - Conversational / greetings
2. Update QUICK_SUGGESTIONS to include 2 global knowledge chips alongside 2 creator tool chips.
3. Update welcome message to mention both global knowledge and creator tools.
4. Update input placeholder to "Ask me anything...".
5. Validate and deploy.
