# PR-2: Quick Reference Guide

## 🚀 How to Test PR-2

### Start the App
```bash
cd /Users/ethan/Desktop/Github/Gauntlet/ClipForge/ClipForge
npm start
```

### Basic Test Flow
1. **Import a video** - Drag MP4/MOV/WebM file onto drop zone
2. **Check timeline** - Clip should appear with thumbnail
3. **Select clip** - Click on clip (should highlight blue)
4. **Delete clip** - Click × button, confirm deletion
5. **Import multiple** - Use "Or choose files" button

---

## 📂 Key Files to Review

### Core Implementation
- `electron/fileManager.js` - Metadata extraction & thumbnails
- `src/App.jsx` - Main app with state management
- `src/components/FileImporter.jsx` - Import UI
- `src/components/Timeline.jsx` - Clip list display
- `src/components/Notifications.jsx` - Toast system

### Utilities
- `src/utils/uuid.js` - ID generation
- `src/utils/formatters.js` - Duration/resolution formatting
- `src/utils/constants.js` - Configuration & error messages
- `src/utils/toastContext.js` - Toast context provider

### Styling
- `src/styles/main.css` - Global styles
- `src/components/*.css` - Component-specific styles

---

## 🎯 What Works Now

✅ Drag & drop video import  
✅ File picker import  
✅ Metadata extraction (duration, resolution)  
✅ Thumbnail generation  
✅ Timeline display with clips  
✅ Clip selection  
✅ Clip deletion  
✅ Toast notifications  
✅ Error handling  
✅ Loading states  
✅ Empty states  

---

## ⏳ What's Coming Next (PR-3)

⏳ Video preview player  
⏳ Play/pause controls  
⏳ Scrubber/seek bar  
⏳ Current time display  

---

## 🐛 How to Report Issues

If you find bugs during testing:

1. Note the exact steps to reproduce
2. Check console for errors (DevTools → Console)
3. Note expected vs actual behavior
4. Add to PR2_TESTING_CHECKLIST.md

---

## 📊 Performance Benchmarks

**Expected Performance:**
- Import time: < 5 seconds per file
- Thumbnail generation: < 3 seconds
- Timeline scrolling: 60fps with 10+ clips
- Memory usage: < 200MB with 10 clips

---

## 🔧 Troubleshooting

### App won't start
```bash
npm install
npm start
```

### FFmpeg errors
- Dev mode: `brew install ffmpeg`
- Production: FFmpeg is bundled

### Import fails
- Check file format (MP4, MOV, WebM only)
- Check file permissions
- Check console for specific error

### Thumbnails not showing
- Check if base64 data is being returned
- Check console for FFmpeg errors
- Try different video file

---

## 💻 Development Commands

```bash
# Start dev mode
npm start

# Package for production
npm run make

# Check for errors
# (Open DevTools in running app)
```

---

## 📝 Code Patterns

### Adding a new clip
```javascript
const newClip = {
  id: generateUuid(),
  fileName: 'video.mp4',
  filePath: '/path/to/video.mp4',
  source: 'import',
  duration: 120.5,
  width: 1920,
  height: 1080,
  thumbnail: 'data:image/jpeg;base64,...',
  trimStart: 0,
  trimEnd: 120.5,
  order: 0,
  track: 'main'
};
setClips(prev => [...prev, newClip]);
```

### Showing a toast
```javascript
const { showToast } = useToast();
showToast('Success message', 'success');
showToast('Error message', 'error');
```

### Calling IPC
```javascript
const metadata = await window.electronAPI.readMetadata(filePath);
```

---

## 🎨 Design Tokens

```css
--primary: #4A90E2 (blue)
--success: #7ED321 (green)
--error: #D0021B (red)
--warning: #F5A623 (orange)
```

---

## ✅ Definition of Done

PR-2 is complete when:
- [x] All 8 implementation tasks done
- [ ] All 48 manual tests pass
- [ ] No console errors
- [ ] Performance benchmarks met
- [ ] Code committed with clear message
- [ ] Ready to demo

---

## 📞 Need Help?

Check these files:
- `PR2_COMPLETION_SUMMARY.md` - Full implementation details
- `PR2_TESTING_CHECKLIST.md` - Complete test suite
- `planning/tasks_MVP.md` - Original requirements

---

**Status:** ✅ Implementation Complete - Ready for Testing  
**Next:** Run manual tests, fix any issues, commit & push

