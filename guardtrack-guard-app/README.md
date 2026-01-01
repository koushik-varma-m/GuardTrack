# GuardTrack - Guard Mobile App

Flutter mobile application for guards in the Guard Monitoring System. This app allows guards to view their assignments, scan QR codes at checkpoints, and track their check-in history.

## What This App Does

- **Authentication**: Login with email/password, auto-login on app restart
- **Dashboard**: View active assignment details, shift times, and next due checkpoint time
- **QR Scanning**: Scan QR codes at checkpoints to create check-ins with real-time status (GREEN/ORANGE/RED)
- **Manual Entry**: Alternative to QR scanning - manually enter checkpoint ID
- **Checkpoints List**: View all checkpoints for the active assignment
- **History**: View check-in history for any selected date with on-time/late status

## Setup

### Prerequisites

- Flutter SDK 3.x or higher
- Dart SDK
- Android Studio / Xcode (for mobile development)

### Configuration

1. **Set API Base URL**

   Open `lib/config/api_config.dart` and update the `baseUrl`:

   ```dart
   static const String baseUrl = 'http://localhost:4000/api/v1';
   ```

   **For physical device testing:**
   - Use your computer's IP address instead of `localhost`
   - Example: `http://192.168.1.100:4000/api/v1`
   - Ensure your device and computer are on the same network

2. **Install Dependencies**

   ```bash
   flutter pub get
   ```

3. **Run the App**

   ```bash
   flutter run
   ```

   Or run on a specific device:

   ```bash
   # Android
   flutter run -d android

   # iOS
   flutter run -d ios

   # Web
   flutter run -d chrome
   ```

## Project Structure

```
lib/
  main.dart                    # App entry point with Provider setup
  config/
    api_config.dart           # API base URL configuration
  models/                     # Data models
  services/                   # API services
  providers/                  # State management (Provider pattern)
  screens/                    # UI screens
  widgets/                    # Reusable widgets
```

## Features

- Material 3 design
- Auto-logout on 401 Unauthorized responses
- Persistent authentication (token saved in shared_preferences)
- Real-time check-in status feedback
- Pull-to-refresh on lists
- Error handling with retry options

## Dependencies

- `provider` - State management
- `http` - API calls
- `shared_preferences` - Token storage
- `mobile_scanner` - QR code scanning
- `intl` - Date/time formatting

## Notes

- The app requires a running backend API server
- Only users with `GUARD` role can access the app
- QR codes must contain JSON: `{"checkpointId": "...", "premiseId": "..."}`
- Check-in status is calculated server-side based on interval timing
