# Hackathon Plan: Google Meet-like Video Call MVP

## Objective

Build a Minimum Viable Product (MVP) of a Google Meet-like video calling application within hackathon constraints. The app will allow multiple users to join a room, share video/audio, chat in real-time, and detect ArUco markers on video streams. All core UI and logic will be implemented directly within `src/main.js` for this MVP.

## Core Features (MVP)

1.  **Multi-Participant Video/Audio (in `src/main.js`):**
    *   Users can join a common room by providing a username, room ID, and optional profile picture URL.
    *   Each user can publish their camera and microphone.
    *   Users can see and hear other participants.
    *   Ability to toggle local camera and microphone on/off.
2.  **Simple Profile Picture Display (in `src/main.js`):**
    *   When a user's camera is off, display a profile picture from a user-provided URL.
    *   Display a default avatar if no URL is provided or if the image fails to load.
3.  **Real-Time Chat (Agora RTM in `src/main.js`):**
    *   A chat panel where all room participants can send and receive text messages.
    *   Leverage Agora RTM SDK for chat functionality, integrated into `src/main.js`.
4.  **ArUco Marker Detection (in `src/main.js`):**
    *   Detect ArUco markers on local and remote video streams using `js-aruco`.
    *   Display detected marker information or overlays on the video streams.
5.  **Existing Token Authentication:**
    *   Utilize the current `/pages/api/token.js` for generating Agora RTC (and RTM, if needed) tokens.

## Simplified Architecture (for `src/main.js` MVP)

*   **`src/main.js`:** This single JavaScript file will be the core of the application, responsible for:
    *   **DOM Manipulation:** Dynamically creating and managing all UI elements (entry screen, participant grid, individual participant tiles, controls, chat panel) within a main `#app` div.
    *   **Agora RTC Client Logic:** Initializing the client, joining/leaving channels, publishing local audio/video tracks, subscribing to remote tracks, and handling RTC events.
    *   **Agora RTM Client Logic:** Initializing the client, logging in, joining/leaving RTM channels, sending/receiving chat messages, and handling RTM events.
    *   **ArUco Marker Detection:** Integrating `js-aruco` library, setting up detection on video elements, and displaying marker data.
    *   **State Management:** Using plain JavaScript variables and functions to manage application state (e.g., connected users, media states, current room).
*   **`index.html` (or basic HTML served by Next.js if `_app.js` or `index.js` is minimal):** Provides the root `<div id="app"></div>` container where `src/main.js` will render the UI. It will also include the `<script src="src/main.js"></script>` tag.
*   **`/pages/api/token.js`:** Remains unchanged for generating Agora tokens.
*   **CSS:** Basic styling will be applied via a linked CSS file (e.g., `styles/globals.css` or `style.css`) or inline styles within `src/main.js` if necessary for simplicity.

## Key Logic within `src/main.js`

*   **Initialization (`initApp` function):** Sets up initial UI (entry form), event listeners for join button.
*   **Entry UI Management:** Functions to get user input (username, room ID, profile pic URL), validate, and trigger the join process.
*   **Call UI Management:** Functions to dynamically create/update/remove DOM elements for:
    *   Participant grid.
    *   Individual participant tiles (containing video/avatar, name, status indicators).
    *   Controls bar (mic, camera, leave, chat toggle).
    *   Chat panel (message display area, input field, send button).
*   **Agora RTC Integration:** Adapt existing RTC functions:
    *   `initializeAgoraClient`, `fetchToken`.
    *   `joinAndPublish` (modified to handle new entry UI data and create local participant tile).
    *   `subscribeToRemoteUser`, `handleUserPublished`, `handleUserUnpublished`, `handleUserLeft` (modified to manage remote participant tiles in the grid).
    *   `leaveChannel` (modified to clean up UI and RTM connection).
*   **Agora RTM Integration (New):**
    *   Functions to initialize RTM client, log in, join/leave RTM channel (likely same as RTC room ID).
    *   Functions to send chat messages (from chat input) and display them locally.
    *   Event handlers for receiving RTM messages and displaying them in the chat panel.
*   **ArUco Integration:** Maintain and adapt existing functions:
    *   `setupArucoDetection(videoElement, uid)`: Applied to local and remote video elements as they are added to the DOM.
    *   `drawMarkers(markers, canvasContext)`: To visualize markers.
    *   `updateMarkerInfo(uid, markers)`: To display marker data.
*   **Media Control Functions:** For toggling local microphone/camera, updating UI indicators and participant tiles accordingly.
*   **Utility Functions:** E.g., `logMessage` for debugging, DOM manipulation helpers.

## Implementation Steps (Hackathon Prioritized, `src/main.js` focus)

1.  **Setup Basic HTML Structure:**
    *   Ensure a basic HTML page (e.g., modifying `pages/index.js` to be minimal or creating a static `index.html` if not using Next.js for rendering this part) loads `src/main.js` and contains an `<div id="app"></div>`.
    *   Install `agora-rtm-sdk` if not already present. Verify `js-aruco` is correctly sourced/included.
2.  **Refactor `src/main.js` for Entry UI:**
    *   Modify the initial HTML structure in `src/main.js` to include input fields for username, room ID, and profile picture URL, along with a "Join Call" button.
    *   Implement JavaScript logic to handle the join action.
3.  **Implement Core RTC & Participant Grid UI in `src/main.js`:**
    *   Adapt existing Agora RTC logic to work with the new entry details.
    *   Dynamically create and manage DOM elements for a participant grid.
    *   Create functions to add/update/remove participant tiles, displaying local/remote video or avatars, usernames, and media status.
4.  **Integrate Controls UI in `src/main.js`:**
    *   Add DOM elements for microphone toggle, camera toggle, leave call, and chat panel toggle buttons.
    *   Implement event listeners and functions to control local media tracks and update UI states.
5.  **Integrate Token Authentication:**
    *   Ensure `fetchToken` is called before joining RTC and RTM channels, using appropriate parameters.
6.  **Implement Chat with Agora RTM in `src/main.js`:**
    *   Add Agora RTM SDK setup, client initialization, login, and channel join/leave logic.
    *   Implement the chat panel UI (message display area, input field, send button) using DOM manipulation.
    *   Implement functions for sending and receiving RTM messages, updating the chat panel dynamically.
7.  **Integrate Profile Pictures in `src/main.js`:**
    *   When a participant's camera is off, display their provided profile picture URL in their tile. Show a default avatar otherwise.
8.  **Verify and Integrate ArUco Marker Detection in `src/main.js`:**
    *   Ensure `js-aruco` is correctly initialized and accessible.
    *   Adapt `setupArucoDetection` to be called for each local and remote video element added to the participant grid.
    *   Ensure marker overlays or information (`drawMarkers`, `updateMarkerInfo`) are displayed correctly on the respective video streams.
9.  **Basic Styling:**
    *   Apply CSS (via an external file or directly in `src/main.js` if minimal) to make the UI usable and presentable.

## What to De-prioritize (If Time is Short)

*   Advanced UI/UX refinements (focus on core functionality).
*   Persistent chat history (RTM messages are real-time).
*   Complex error handling for all edge cases.
*   Screen sharing, recording, virtual backgrounds (unless ArUco is tied to one of these).
*   Extensive automated testing.

## Technology Stack

*   **Core Logic/UI:** Vanilla JavaScript (`src/main.js`), HTML, CSS.
*   **Real-time Communication:**
    *   Agora RTC SDK (for video/audio).
    *   Agora RTM SDK (for chat).
*   **Marker Detection:** `js-aruco` library.
*   **Token Server:** Existing Next.js API route (`/pages/api/token.js`).
*   **Environment:** Browser environment, potentially served via Next.js dev server if `pages/index.js` acts as a simple HTML host page.
