# MenuMagic Mobile Development Guide

## Overview

MenuMagic has been configured with Capacitor.js for native mobile app development and PWA (Progressive Web App) support.

## What's Been Set Up

### ✅ Capacitor.js Configuration
- **Core packages**: `@capacitor/core`, `@capacitor/cli`
- **Platforms**: Android and iOS
- **Configuration**: `capacitor.config.ts` with app settings
- **Build integration**: Automatic sync with web builds

### ✅ PWA Support
- **Web App Manifest**: `public/manifest.json`
- **Meta tags**: Mobile-optimized HTML meta tags
- **Icons**: Multiple sizes for different devices
- **Install prompt**: "Add to Home Screen" functionality

### ✅ Mobile-Optimized CSS
- **Touch-friendly**: 44px minimum touch targets
- **Safe areas**: iOS notch and Android gesture area support
- **Mobile viewport**: Optimized for mobile devices
- **Text selection**: Proper handling for mobile interaction

## Development Workflow

### Quick Commands

```bash
# Build and sync with Capacitor
npm run cap:build

# Just sync (after manual build)
npm run cap:sync

# Open Android Studio
npm run cap:open:android

# Open Xcode (requires Xcode installation)
npm run cap:open:ios

# Run on Android device/emulator
npm run cap:run:android

# Run on iOS device/simulator (requires Xcode)
npm run cap:run:ios
```

### Standard Development Flow

1. **Develop**: Make changes to your React app
2. **Build**: `npm run build` or `npm run cap:build`
3. **Sync**: `npx cap sync` (automatic with `cap:build`)
4. **Test**: Open native IDE or run on device

## Platform-Specific Setup

### Android Development

#### Prerequisites
- **Android Studio** (latest version)
- **Java Development Kit** (JDK 11 or higher)
- **Android SDK** (API level 21+)

#### Setup Steps
1. Install Android Studio
2. Install Android SDK
3. Set `ANDROID_HOME` environment variable
4. Accept SDK licenses: `sdkmanager --licenses`

#### Running on Android
```bash
# Open in Android Studio
npm run cap:open:android

# Run on connected device/emulator
npm run cap:run:android
```

### iOS Development

#### Prerequisites
- **Xcode** (latest version, macOS only)
- **CocoaPods** (for dependency management)

#### Setup Steps
1. Install Xcode from Mac App Store
2. Install CocoaPods: `sudo gem install cocoapods`
3. Accept Xcode licenses: `sudo xcodebuild -license accept`

#### Running on iOS
```bash
# Open in Xcode
npm run cap:open:ios

# Run on connected device/simulator
npm run cap:run:ios
```

## PWA Features

### What Users Can Do
- **Install app**: "Add to Home Screen" from browser
- **Offline access**: Basic offline functionality
- **Native feel**: App-like experience in browser
- **Push notifications**: (Future enhancement)

### Testing PWA
1. Build the project: `npm run build`
2. Serve the dist folder: `npm run preview`
3. Open in Chrome/Edge
4. Look for "Install" button in address bar

## Mobile-Specific Considerations

### Touch Interactions
- **Button sizes**: Minimum 44x44px for touch targets
- **Gestures**: Support for swipe, pinch, etc.
- **Feedback**: Visual feedback for touch interactions

### Performance
- **Bundle size**: Optimized for mobile networks
- **Loading**: Splash screen and loading states
- **Memory**: Efficient memory usage for mobile devices

### Device Features
- **Camera**: Scan barcodes for inventory
- **Notifications**: Meal reminders and updates
- **Storage**: Local storage for offline access
- **Geolocation**: Future feature for store locations

## Troubleshooting

### Common Issues

#### Android Build Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run cap:build
```

#### iOS Build Issues
```bash
# Install CocoaPods dependencies
cd ios/App
pod install
cd ../..
npm run cap:build
```

#### Sync Issues
```bash
# Force sync
npx cap sync --force
```

### Debug Mode
```bash
# Enable debug logging
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

## Next Steps

### Immediate Enhancements
1. **Add Capacitor plugins** for device features
2. **Implement offline storage** with Capacitor Storage
3. **Add push notifications** for meal reminders
4. **Camera integration** for barcode scanning

### Advanced Features
1. **Native navigation** with Capacitor Router
2. **Deep linking** for sharing meal plans
3. **Background sync** for offline changes
4. **Native sharing** for meal plans

### App Store Deployment
1. **Test thoroughly** on real devices
2. **Prepare store assets** (screenshots, descriptions)
3. **Configure signing** for app store submission
4. **Submit for review** to Google Play and App Store

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Android Development Guide](https://developer.android.com/guide)
- [iOS Development Guide](https://developer.apple.com/develop/)

## Support

For issues specific to mobile development:
1. Check Capacitor documentation
2. Review platform-specific setup guides
3. Test on multiple devices/emulators
4. Check browser console for PWA issues
