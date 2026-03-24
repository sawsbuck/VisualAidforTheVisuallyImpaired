# AI Accessibility Assistant

A professional, modular Chrome extension providing voice-controlled web navigation and accessibility features.

## Features

✨ **Core Functionality**
- 🎤 Speech-to-text voice recognition
- 🔊 Text-to-speech audio feedback
- ⌨️ Keyboard shortcuts for hands-free operation
- 🌐 Works on any website

✅ **Quality & Professional Standards**
- Modular, maintainable code architecture
- Comprehensive error handling
- Structured logging system
- Configuration management
- Future-proof design patterns
- Clean separation of concerns

## Installation

### For Development

1. **Clone/Download** this extension to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select this folder
5. ✅ Extension is now installed and ready to use!

### Usage

**On any webpage:**
- Press **`V`** to start/stop voice recognition
- Press **`S`** to scroll right
- Check the popup for status and commands

## Project Structure

```
├── config.js                 # Global configuration constants
├── logger.js                 # Logging utility class
├── speech-service.js         # Speech recognition & synthesis service
├── content.js                # Content script (runs on webpages)
├── popup.js                  # Popup UI script
├── popup.html                # Popup interface
├── popup.css                 # Popup styles
├── background.js             # Service worker
├── manifest.json             # Extension manifest
└── README.md                 # This file
```

## Architecture

### Modular Design

Each component has a single responsibility:

- **config.js** - Centralized configuration
- **logger.js** - Consistent logging across modules
- **speech-service.js** - Encapsulates all speech APIs
- **content.js** - Web page interaction logic
- **popup.js** - User interface logic
- **background.js** - Extension-level event handling

### Service Pattern

`SpeechService` provides a clean API:

```javascript
// Start listening
speechService.startListening();

// Register callbacks
speechService.on('onResult', (data) => {
  console.log(data.transcript);
});

// Text-to-speech
speechService.speak("Hello");
```

### Logging System

Consistent logging with configurable levels:

```javascript
const logger = new Logger('ModuleName');
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');
```

Configured in `config.js`:
```javascript
CONFIG.LOGGING.LEVEL = 'INFO'; // ERROR, WARN, INFO, DEBUG
CONFIG.LOGGING.ENABLED = true;
```

## Configuration

Edit `config.js` to customize:

```javascript
CONFIG.SPEECH = {
  LANGUAGE: 'en-US',
  RATE: 1.0,
  PITCH: 1.0,
  VOLUME: 1.0,
};

CONFIG.KEYS = {
  START_LISTENING: 'v',
  SCROLL_RIGHT: 's',
};
```

## Error Handling

Comprehensive error handling for:
- ❌ Microphone not available
- ❌ Missing browser permissions
- ❌ Network errors
- ❌ No speech detected
- ❌ Speech synthesis failures

User-friendly error messages provided for each case.

## Future-Proof Features

✅ **Extensible Architecture**
- Modular services
- Event-based callbacks
- Configuration driven
- Logging framework

✅ **Easy to Extend**
```javascript
// Add new speech callbacks
speechService.on('onCustomEvent', (data) => {
  // Handle event
});

// Add new commands
// Easily add more keyboard shortcuts in handleAction()
```

✅ **Browser Compatibility**
- Chrome/Chromium
- Edge
- Opera
- Future: Firefox (with manifest v2 support)

## Debugging

### Enable Verbose Logging

In `config.js`:
```javascript
CONFIG.LOGGING.LEVEL = 'DEBUG';
```

### View Logs

1. Open DevTools: **F12**
2. Go to **Console** tab
3. All logs from the extension will appear with timestamps and module names

### Check Extension Status

1. Go to `chrome://extensions/`
2. Click extension details to see errors
3. Click "background page" to view service worker console

## Browser Permissions

The extension requests:
- `activeTab` - Access current tab content
- `scripting` - Inject content script
- `<all_urls>` - Run on any website

Permissions are minimized and only what's necessary.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Start/stop voice recognition |
| `S` | Scroll right |

Shortcuts are disabled when typing in input fields.

## Troubleshooting

### "No speech detected" error
- Check microphone is working
- Ensure microphone permission is granted
- Try speaking louder and clearer
- Check browser microphone settings

### Extension not loading on webpage
- Reload the extension: `chrome://extensions/` → refresh button
- Check browser console for errors
- Ensure you're on a regular webpage (not Chrome internal pages)

### Popup won't open
- Clear Chrome cache
- Reload the extension
- Check `chrome://extensions/` for errors

## Development Guidelines

### Adding New Features

1. Create new service class if needed
2. Inject via script tag in manifest.json
3. Use Logger for debugging
4. Add configuration to config.js
5. Document in this README

### Code Style

- Use descriptive variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Use const by default, let if needed
- No var declarations

### Testing

Manual testing on various websites recommended:
- Google.com
- Wikipedia.org
- GitHub.com
- Your own projects

## Version History

### v1.0.0 - Initial Release
- ✨ Voice recognition
- 🔊 Speech synthesis
- ⌨️ Keyboard shortcuts
- 📊 Comprehensive logging
- 🏗️ Modular architecture

## License

This project is provided as-is for educational and personal use.

## Support & Contributing

For bugs, feature requests, or improvements:
1. Test on multiple websites
2. Check browser console for errors
3. Enable DEBUG logging
4. Document the issue with console logs

---

**Made with ❤️ for web accessibility**
