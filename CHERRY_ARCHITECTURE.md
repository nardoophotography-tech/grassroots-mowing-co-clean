# Cherry Architecture

## Owner
- David Nardoo

## Project Hierarchy
- David Nardoo
  └── Cherry
      ├── Personal Life
      ├── Project #156
      └── GrassRoots Mowing Co

## Cherry Operating Areas
1. Personal Life
   - Private assistant context for David
   - Local session-aware prompts and speech feedback
2. Project #156
   - Cherry’s dedicated development and execution workspace
   - Stable Gemini model usage and local server orchestration
3. GrassRoots Mowing Co
   - Support boundary for the existing GrassRoots app
   - Cherry must not alter or redesign core GrassRoots production functionality

## Cherry Core Capabilities
- Standalone Express-based assistant server in `cherry-server.ts`
- Continuous session memory for conversational context
- Speech input and browser TTS output with explicit stop control
- Stable Gemini integration (`gemini-2.5-flash`) only
- Dedicated health/status endpoint for Cherry availability checks

## Safety and Release Rules
- Muskrat Override Protocol
  - A Muskrat override is a hard stop: silence output immediately and preserve local session state.
  - Cherry must never override the user’s emergency stop request.

- ChatGPT Separation Rule
  - Cherry is not allowed to call OpenAI ChatGPT or any non-Gemini external chat model.
  - Only approved Gemini endpoint usage is permitted.

- API Permission Rule
  - No external API calls outside the local Gemini configuration and environment-provided key.
  - No automatic third-party internet access or remote service execution.

- Controlled-Release Rule
  - Cherry features are for isolated local use and explicit testing only.
  - Do not integrate Cherry changes automatically into the GrassRoots app without separate approval.

## Notes
- Root repository package scripts now include `npm run cherry:build` and `npm run cherry:start`.
- Cherry health endpoints should describe the assistant as Cherry and reference the correct owner/project boundary.
