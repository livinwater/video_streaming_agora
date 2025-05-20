# MVP Build Tasks

## UI Elements Checklist (Implemented in `src/main.js`)

Use this checklist to verify that the required UI elements are working properly as you build the application directly in `src/main.js`:

### Core Video/Audio UI (in `src/main.js`)
- [ ] Participant grid displays all users in a responsive layout.
- [ ] Individual participant tiles show video when camera is on.
- [ ] Profile picture/avatar (from URL or default) displays when camera is off.
- [ ] Microphone mute/unmute status is visually indicated on tiles.
- [ ] Camera on/off status is visually indicated on tiles.
- [ ] User names are displayed on participant tiles.
- [ ] Current speaker is highlighted visually (Optional MVP+).

### Controls UI (in `src/main.js`)
- [ ] Microphone toggle button works and shows correct state.
- [ ] Camera toggle button works and shows correct state.
- [ ] Leave call button works and resets UI.
- [ ] Chat panel toggle button works (shows/hides chat panel).

### Chat UI (in `src/main.js`)
- [ ] Chat panel displays correctly when toggled.
- [ ] Messages appear with sender name (and timestamp if feasible).
- [ ] Chat input allows message typing and sending.
- [ ] New messages are properly displayed in the chat panel.

### Entry/Join UI (in `src/main.js`)
- [ ] Room joining interface (username, room ID, profile pic URL inputs) is displayed initially.
- [ ] Join button collects input and initiates connection to the correct room.

### ArUco Marker Detection UI (in `src/main.js`)
- [ ] ArUco marker overlay/information is visible on video streams when markers are present.
- [ ] ArUco detection initializes correctly for local and remote video streams.

## Immediate UI Development (High Priority - in `src/main.js`)

### Task 0.1: Implement Participant Grid Display in `src/main.js`
- **Start:** Develop DOM manipulation logic in `src/main.js` to display all participants in a grid layout.
- **End:** Users can see all participant tiles in a responsive grid.
- **Priority:** HIGH

### Task 0.2: Implement Microphone Toggle Functionality in `src/main.js`
- **Start:** Create mic on/off controls in `src/main.js` (button and logic) using Agora SDK.
- **End:** Users can toggle their microphone status with visual indicator on their tile and button.
- **Priority:** HIGH

### Task 0.3: Display Participant Information in `src/main.js`
- **Start:** Add visual elements to participant tiles in `src/main.js` to show participant names and media status.
- **End:** Each participant tile displays relevant information.
- **Priority:** HIGH

### Task 0.4: Implement Entry UI in `src/main.js`
- **Start:** Develop the initial UI in `src/main.js` for username, room ID, and profile picture URL input.
- **End:** Users can input their details, and a join button triggers the connection process.
- **Priority:** HIGH

## Setup and Configuration

### Task 1: Initialize Project Environment
- **Start:** Ensure a basic HTML host page (e.g., `pages/index.js` simplified or a static `index.html`) is set up to load `src/main.js` and provide an `#app` div.
- **End:** Project runs, `src/main.js` is loaded, and the initial UI (Entry Form) is visible.

### Task 2: Install/Verify Dependencies
- **Start:** Ensure `agora-rtc-sdk-ng` is installed. Install `agora-rtm-sdk`. Verify `js-aruco` library is correctly sourced/included and accessible by `src/main.js`.
- **End:** All necessary SDKs and libraries are ready for use in `src/main.js`.

## Core RTC Functionality (in `src/main.js`)

### Task 3: Adapt Agora RTC Logic in `src/main.js`
- **Start:** Review and modify existing RTC functions in `src/main.js` (initialization, token fetching, event handling).
- **End:** RTC client initializes, uses fetched tokens, joins/leaves channels based on new UI flow, and handles basic user events.

### Task 4: Implement Local Video/Audio Publishing in `src/main.js`
- **Start:** Connect local track creation and publishing logic in `src/main.js` to the new Entry UI and media controls.
- **End:** Local video/audio streams are published, and the local user's tile is displayed in the grid with video/avatar.

### Task 5: Implement Remote User Subscription in `src/main.js`
- **Start:** Adapt remote user event handling (`user-published`, `user-unpublished`, `user-left`) in `src/main.js` to dynamically create, update, and remove remote participant tiles in the grid.
- **End:** Remote user streams (video/audio) are displayed in their respective tiles, with avatars for video-off states.

## UI Implementation (all within `src/main.js`)

### Task 6: Implement Participant Grid & Tile Logic in `src/main.js` (Combines old Task 6 & 7)
- **Start:** Develop DOM manipulation functions in `src/main.js` for creating a responsive participant grid and for generating/updating individual participant tiles (to show video/avatar, name, media status icons).
- **End:** Grid dynamically displays all participant tiles correctly reflecting their state.

### Task 7: Implement Controls Bar in `src/main.js` (Was Task 8)
- **Start:** Add DOM elements for mic/cam toggles, leave call, and chat toggle buttons to `src/main.js`. Implement their event listeners and corresponding logic.
- **End:** Controls can manage local media, initiate leave, and toggle chat panel visibility, updating UI accordingly.

## Token Authentication

### Task 8: Integrate RTC/RTM Token Fetching (Was Task 9)
- **Start:** Ensure the `fetchToken` function in `src/main.js` is correctly called for both RTC and RTM (if RTM token is distinct) before joining channels.
- **End:** Valid tokens are used to join RTC and RTM channels securely.

## Chat Functionality (Agora RTM in `src/main.js`)

### Task 9: Initialize Agora RTM in `src/main.js` (Was Task 10)
- **Start:** Import `agora-rtm-sdk`. Add logic to `src/main.js` to initialize the RTM client, log in (using UID and RTM token), and join/leave an RTM channel (ideally same as Room ID).
- **End:** RTM client is connected to the specified channel and ready for messaging.

### Task 10: Implement Chat Messaging Logic in `src/main.js` (Was Task 11)
- **Start:** Develop functions in `src/main.js` to send RTM channel messages (based on chat input) and handle received RTM channel messages.
- **End:** Messages can be sent and received successfully via the RTM channel.

### Task 11: Implement Chat Panel UI in `src/main.js` (Was Task 12 & 13)
- **Start:** Create DOM elements within `src/main.js` for the chat panel (message display area, text input field, send button). Implement show/hide logic for the panel.
- **End:** Chat panel displays messages with sender information, allows users to type and send messages, and can be toggled.

## Profile Picture Display (in `src/main.js`)

### Task 12: Implement Profile Picture Logic in `src/main.js` (Was Task 14, then 13)
- **Start:** Enhance participant tile logic in `src/main.js` to use the user-provided profile picture URL for the avatar when video is off. Display a default avatar if no URL is given or image fails.
- **End:** Profile pictures or default avatars are correctly displayed on participant tiles when their video is off.

## ArUco Marker Detection (in `src/main.js`)

### Task 13: Verify `js-aruco` Setup (New, was Task 14 conceptually)
- **Start:** Ensure `js-aruco` library is correctly included/sourced and its detector can be initialized in `src/main.js`.
- **End:** `js-aruco` is confirmed to be working and ready for use.

### Task 14: Integrate ArUco Detection for Local Video (New, was Task 15 conceptually)
- **Start:** Adapt or call the existing `setupArucoDetection` function (or equivalent logic) in `src/main.js` to attach to the local user's video element within their participant tile.
- **End:** ArUco markers are detected, and feedback (e.g., canvas overlay, console logs) is visible for the local video stream.

### Task 15: Integrate ArUco Detection for Remote Videos (New, was Task 16 conceptually)
- **Start:** Modify `src/main.js` so that `setupArucoDetection` is called for each remote participant's video element when their tile is created/video starts.
- **End:** ArUco markers are detected, and feedback is visible for all remote video streams where markers are present.

### Task 16: Display ArUco Marker Information (New, was Task 17 conceptually)
- **Start:** Ensure the existing `drawMarkers` and `updateMarkerInfo` functions (or equivalent logic for displaying marker data) in `src/main.js` are correctly drawing on associated canvases or updating info displays for each video stream with detected markers.
- **End:** Visual feedback for detected ArUco markers is clearly provided on the respective video streams in the participant grid.

## Final Steps

### Task 17: Basic Styling (Was Task 18)
- **Start:** Apply necessary CSS (via linked file or inline in `src/main.js`) for the usability and basic appearance of all UI elements managed by `src/main.js`.
- **End:** UI is styled, functional, and reasonably presentable.

### Task 18: Testing and Debugging (Was Task 19)
- **Start:** Thoroughly test all functionalities end-to-end: joining, video/audio, participant grid, controls, chat, profile pictures, ArUco detection on multiple streams, and leaving the call.
- **End:** MVP is robustly tested, major bugs are fixed, and the application is ready for demonstration.
