# CARA mobile redesign

## Goal
Make CARA feel like a focused conversation screen rather than a long directory of buttons, while keeping every existing topic and feature available.

## What will change

### 1. Put the conversation first
- Replace the crowded opening area with a compact CARA heading, short welcome line, and one clear **Ask CARA** area.
- Keep the message area visible near the top so users immediately understand that they can type or speak naturally.
- Keep the message box close to the bottom navigation while chatting, with large microphone and send controls that remain easy to reach.

### 2. Simplify topic discovery
- Replace the full wall of topic capsules with a single **Browse topics** control and a few useful starting suggestions.
- Organise all topics into clear, collapsible groups such as staff conduct, attendance and leave, performance and employment changes, and specialist compliance.
- Show only one group at a time. Search results will appear as a clean list rather than another cloud of capsules.
- Preserve Drivers/AARTO, Foreign Nationals, government tools, and every existing topic and answer.

### 3. Reduce competing instructions
- Merge “Start here”, the large empty-state introduction, “tap a topic”, and the example guidance into one concise welcome state.
- Keep **Show me how it works** as a secondary option instead of the most visually dominant action.
- Keep company-profile, installation, and trial notices, but ensure they do not visually compete with CARA’s main action.

### 4. Clean up the mobile presentation
- Use one consistent spacing rhythm, restrained borders, clear headings, and fewer boxed sections.
- Keep the existing dark iNRECO look, semantic colours, bottom navigation, and phone-first sizing.
- Prevent the report control, header, conversation, and bottom navigation from overlapping each other on small screens.
- Retain at least 52–56px touch areas for primary mobile controls.

## Behaviour that stays unchanged
- CARA’s answers, document suggestions, follow-up questions, voice transcription, and optional voice auto-send.
- Guest-question handoff after sign-up, company-profile reminder, trial notices, installation prompt, and subscription rules.
- Existing bottom navigation and back navigation.

## Validation
- Test the redesigned CARA screen at 390×844 and the current phone screenshot width, including long company names and all notices showing.
- Check opening and closing topic groups, searching, selecting a topic, typing, voice input, sending, follow-ups, document actions, and scrolling through a long conversation.
- Confirm there is no clipped content, horizontal scrolling, hidden message box, or overlap with the report control and bottom navigation.

## Technical details
- Refactor the CARA page into focused welcome, topic-browser, transcript, and composer sections while reusing the current topic and chat logic.
- Use the existing shared buttons, cards, icons, and colour tokens; no new colours or navigation system.
- Keep topic grouping as presentation-only data so the underlying CARA knowledge remains untouched.
