# VigyanYantra — Full Deployment Build

This package preserves the complete VigyanYantra feature set and puts `index.html` at the project root so hosts that require a top-level index can detect it.

## Run locally
```bash
npm install
npm start
```
Then open `http://localhost:3000`.

## AI
Create `.env` beside `package.json` from `.env.example`. Keep API keys server-side.

## Important
A static drag-and-drop host can serve the frontend, but it cannot run `server.js`. For the full system—including the server-side AI API—you need a Node-capable host.

## Included features
- Student signup/login and portal
- Teacher login and teacher-owned courses
- Founder/admin portal
- Course creation, saving and publishing
- Lessons with video upload/playback (100 MB limit, no video download button)
- PDF resources with view/open/download
- GitHub repository links
- Google Forms quiz links
- Course enrollment and saved student progress
- AI assistant with server-side OpenAI/Gemini API integration
- AI chat resets on refresh/reopen
- Home-page Student Signup/Login button
- Mobile-friendly AI open/close button
