# MVP Build Tasks

## UI Elements Checklist

Use this checklist to verify that the required UI elements are working properly as you build the application:

### Core Video/Audio UI
- [ ] Participant grid displays all users in a responsive layout
- [ ] Individual participant tiles show video when camera is on
- [ ] Profile picture/avatar displays when camera is off
- [ ] Microphone mute/unmute status is visually indicated
- [ ] Camera on/off status is visually indicated
- [ ] User names are displayed on participant tiles
- [ ] Current speaker is highlighted visually

### Controls UI
- [ ] Microphone toggle button works and shows correct state
- [ ] Camera toggle button works and shows correct state
- [ ] Leave call button works
- [ ] Chat panel toggle button works

### Chat UI
- [ ] Chat panel displays correctly
- [ ] Messages appear with sender name
- [ ] Messages show timestamps
- [ ] Chat input allows message typing and sending
- [ ] New messages are properly displayed in the chat panel

### Entry/Join UI
- [ ] Room joining interface works (enter room ID)
- [ ] Profile picture URL input works
- [ ] Username input works
- [ ] Join button connects to the correct room

## Immediate UI Development (High Priority)

### Task 0.1: Implement Participant Grid Display
- **Start:** Develop UI to display all participants in a grid layout
- **End:** Users can see all participants in a responsive grid
- **Priority:** HIGH - Must be implemented first for visual feedback

### Task 0.2: Implement Microphone Toggle Functionality
- **Start:** Create mic on/off controls using existing codebase
- **End:** Users can toggle their microphone status with visual indicator
- **Priority:** HIGH - Core functionality needed for testing

### Task 0.3: Display Participant Information
- **Start:** Add visual elements to show participant names/status
- **End:** Each participant tile displays relevant information
- **Priority:** HIGH - Essential for user identification in the call

## Setup and Configuration

### Task 1: Initialize Project
- **Start:** Create a new Next.js project or ensure the existing one is set up.
- **End:** Project is running with a basic Next.js setup.

### Task 2: Install Dependencies
- **Start:** Add necessary Agora SDKs and other dependencies.
- **End:** `agora-rtc-sdk-ng` and `agora-rtm-sdk` are installed and listed in `package.json`.

## Core RTC Functionality

### Task 3: Create `useAgoraRTC.js` Hook
- **Start:** Set up a new hook for managing RTC logic.
- **End:** Hook initializes Agora RTC client and can join a channel.

### Task 4: Implement Local Video/Audio Publishing
- **Start:** Use `useAgoraRTC.js` to publish local video/audio.
- **End:** Local video/audio streams are published to the channel.

### Task 5: Implement Remote User Subscription
- **Start:** Use `useAgoraRTC.js` to subscribe to remote users.
- **End:** Remote user streams are displayed.

## UI Components

### Task 6: Create `ParticipantGrid.jsx`
- **Start:** Set up a grid layout for video streams.
- **End:** Grid displays all participant video streams.

### Task 7: Create `ParticipantTile.jsx`
- **Start:** Implement a component for individual participant display.
- **End:** Component shows video or avatar for each participant.

### Task 8: Create `Controls.jsx`
- **Start:** Implement controls for toggling camera/mic.
- **End:** Controls can toggle local camera/mic on/off.

## Token Authentication

### Task 9: Integrate RTC Token Fetching
- **Start:** Fetch RTC token from `/api/token`.
- **End:** Token is used to join RTC channel securely.

## Chat Functionality

### Task 10: Create `useAgoraRTM.js` Hook
- **Start:** Set up a new hook for managing RTM logic.
- **End:** Hook initializes Agora RTM client and can join a channel.

### Task 11: Implement Chat Messaging
- **Start:** Use `useAgoraRTM.js` to send/receive messages.
- **End:** Messages are exchanged in real-time.

### Task 12: Create `ChatPanel.jsx`
- **Start:** Implement UI for displaying chat messages.
- **End:** Chat panel displays messages with timestamps.

### Task 13: Create `ChatInput.jsx`
- **Start:** Implement input for sending chat messages.
- **End:** Users can send messages via the input field.

## Profile Picture Display

### Task 14: Implement Profile Picture Logic
- **Start:** Allow users to input a profile picture URL.
- **End:** Display profile picture when video is off.

## Context Integration

### Task 15: Set Up `RoomContext.jsx`
- **Start:** Create context for managing room state.
- **End:** Context tracks participants and stream states.

### Task 16: Set Up `ChatContext.jsx`
- **Start:** Create context for managing chat state.
- **End:** Context tracks chat messages and RTM client.

## Final Steps

### Task 17: Basic Styling
- **Start:** Apply minimal CSS for usability.
- **End:** UI is styled and functional.

### Task 18: Testing and Debugging
- **Start:** Test each component and integration.
- **End:** MVP is tested and ready for demonstration.
