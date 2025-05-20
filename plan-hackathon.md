# Hackathon Plan: Google Meet-like Video Call MVP

## Objective

Build a Minimum Viable Product (MVP) of a Google Meet-like video calling application within hackathon constraints. The app will allow multiple users to join a room, share video/audio, and chat in real-time.

## Core Features (MVP)

1.  **Multi-Participant Video/Audio:**
    *   Users can join a common room.
    *   Each user can publish their camera and microphone.
    *   Users can see and hear other participants.
    *   Ability to toggle local camera and microphone on/off.
2.  **Simple Profile Picture Display:**
    *   When a user's camera is off, display a profile picture.
    *   Users can provide an image URL for their profile picture upon joining (no backend storage for this MVP).
    *   Display a default avatar if no URL is provided or if the image fails to load.
3.  **Real-Time Chat:**
    *   A chat panel where all room participants can send and receive text messages.
    *   Leverage **Agora RTM (Real-Time Messaging) SDK** for chat functionality.
4.  **Existing Token Authentication:**
    *   Utilize the current `/pages/api/token.js` for generating Agora RTC (and RTM, if needed) tokens.

## Simplified Architecture

### File Structure (Simplified)

```
/video_call_agora/
├── components/                 # React components
│   ├── VideoCall/
│   │   ├── ParticipantGrid.jsx # Displays all video streams/avatars
│   │   ├── ParticipantTile.jsx # Individual user's video or avatar
│   │   └── Controls.jsx        # Buttons for mic/cam toggle, leave
│   ├── Chat/
│   │   ├── ChatPanel.jsx       # Main chat interface
│   │   ├── ChatMessage.jsx     # Displays a single chat message
│   │   └── ChatInput.jsx       # Input field for sending messages
│   └── UI/
│       └── Avatar.jsx          # Displays profile picture or default
├── context/                    # React Context for state
│   ├── RoomContext.jsx         # Manages participants, streams, room state
│   └── ChatContext.jsx         # Manages RTM client, chat messages
├── hooks/                      # Custom React Hooks
│   ├── useAgoraRTC.js          # Encapsulates Agora RTC logic (joining, publishing, subscribing)
│   └── useAgoraRTM.js          # Encapsulates Agora RTM logic (login, channels, messages)
├── pages/
│   ├── index.js                # Entry page to join/create a room
│   ├── room/[roomId].js        # The main video call and chat room page
│   └── api/
│       └── token.js            # Existing token generation API (ensure it can also serve RTM tokens if required by Agora RTM setup)
├── public/
│   └── default-avatar.png      # Default avatar image
├── styles/
│   └── globals.css             # Basic styling
├── utils/
│   └── agoraClientConfig.js    # Basic Agora App ID and client configurations
├── .env                        # Environment variables (APP_ID, APP_CERTIFICATE)
└── next.config.js
└── package.json
```

### Key Components & Logic

*   **`pages/room/[roomId].js`:**
    *   Main page orchestrating the video call and chat.
    *   Initializes `RoomContext` and `ChatContext`.
    *   Handles fetching Agora tokens.
*   **`useAgoraRTC.js` (Hook):**
    *   Manages Agora RTC client initialization, joining a channel, publishing local tracks (audio/video), and subscribing to remote user tracks.
    *   Handles RTC events like `user-published`, `user-unpublished`.
*   **`useAgoraRTM.js` (Hook):**
    *   Manages Agora RTM client login, joining an RTM channel (can be the same name as the RTC room/channel for simplicity).
    *   Handles sending and receiving RTM channel messages.
    *   Manages RTM events like `MessageFromPeer` or `ChannelMessage`.
*   **`RoomContext.jsx`:**
    *   Stores list of participants, their UID, video/audio status, and profile image URL.
    *   Provides functions to update participant status (e.g., camera on/off).
*   **`ChatContext.jsx`:**
    *   Stores chat messages.
    *   Provides a function to send a chat message via RTM.
*   **Token Generation (`/pages/api/token.js`):**
    *   Verify if the current token generation needs any modification for RTM. Often, RTC tokens can be used for RTM, or a similar token generation logic can be applied for RTM if it requires its own token type. *Consult Agora documentation for RTM token requirements with your specific SDK version.*

### State Management

*   **React Context API** will be used for managing shared state:
    *   `RoomContext`: Participants, stream states, local user's media status.
    *   `ChatContext`: RTM client instance, received chat messages.
*   Local component state for UI elements (e.g., input fields).

## Implementation Steps (Hackathon Prioritized)

1.  **Setup Basic Next.js Project:**
    *   Ensure Next.js is set up. Install `agora-rtc-sdk-ng` and `agora-rtm-sdk`.
2.  **Core RTC Functionality:**
    *   Create `useAgoraRTC.js` hook.
    *   Implement joining an RTC channel, publishing local video/audio.
    *   Implement subscribing to remote users and displaying their video/audio.
    *   Create `ParticipantGrid.jsx` and `ParticipantTile.jsx` to display video streams.
    *   Implement `Controls.jsx` for toggling local camera/microphone.
3.  **Integrate Token Authentication:**
    *   Fetch RTC token from existing `/api/token` endpoint before joining the RTC channel.
4.  **Chat with Agora RTM:**
    *   Create `useAgoraRTM.js` hook.
    *   Implement RTM login and joining an RTM channel.
    *   Implement sending and receiving channel messages.
    *   Create `ChatPanel.jsx`, `ChatMessage.jsx`, `ChatInput.jsx` for the chat UI.
    *   Fetch RTM token if necessary (check Agora docs – sometimes RTC token suffices or a similar generation is needed).
5.  **Simple Profile Pictures:**
    *   Allow user to input an image URL on joining (e.g., in `pages/index.js`).
    *   Pass this URL to `ParticipantTile.jsx` and display using `Avatar.jsx` when video is off.
    *   Include a default avatar in `public/`.
6.  **Context Integration:**
    *   Wire up `RoomContext` and `ChatContext` to share state between components.
7.  **Basic Styling:**
    *   Apply minimal CSS for a usable interface.

## What to De-prioritize (If Time is Short)

*   Advanced UI/UX (focus on functionality).
*   Persistent chat history (RTM messages are generally real-time unless you add a backend).
*   Complex error handling and edge cases.
*   Backend storage for profile pictures or user accounts.
*   Screen sharing, recording, virtual backgrounds.
*   Extensive testing.

## Technology Stack

*   **Frontend:** Next.js (React)
*   **Real-time Communication:**
    *   Agora RTC SDK (for video/audio)
    *   Agora RTM SDK (for chat)
*   **Styling:** Basic CSS / `globals.css`
*   **Token Server:** Existing Next.js API route (`/pages/api/token.js`)

This condensed plan should provide a clear path to achieving your core goals for the hackathon while leveraging your existing infrastructure and the power of Agora RTM for chat.
