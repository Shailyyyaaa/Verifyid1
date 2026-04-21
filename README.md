# VerifyID — Identity Validation Portal

## What this app does
A complete AI-powered identity validation portal with:
- Depositor account verification (OTP flow)
- AI-powered OCR on PAN and Aadhaar documents
- Webcam liveness detection with AI face analysis
- eSign flow
- Admin dashboard with AI-generated validation reports

---

## How to Deploy on Vercel (Step by Step — No coding needed)

### Step 1: Create a Vercel account
1. Go to **vercel.com**
2. Click **Sign Up**
3. Sign up with your email or GitHub account (free)

### Step 2: Upload your project
1. Once logged in, click **Add New → Project**
2. Click **"Deploy from your computer"** or drag and drop the entire `verifyid` folder
3. Vercel will automatically detect the project

### Step 3: Set environment variables (for AI features)
1. Before deploying, click **Environment Variables**
2. Add this variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your API key when you have it)
   - If you don't have a key yet, skip this — app will run in Demo Mode
3. Also add:
   - Name: `DEMO_MODE`
   - Value: `true` (change to `false` when you have a real API key)

### Step 4: Deploy
1. Click **Deploy**
2. Wait ~60 seconds
3. Vercel gives you a public URL like: `https://verifyid-abc123.vercel.app`
4. Share this URL with hackathon judges!

---

## Demo Credentials

### Depositor Portal
- **Demo accounts:** ACC001234, ACC002345, ACC003456 ... up to ACC020123
- **OTP:** 1234 (all OTPs)

### Admin Portal
- **Username:** admin
- **Password:** verify@2026

---

## Adding Your API Key Later

When you have your Anthropic API key:
1. Go to your Vercel project dashboard
2. Click **Settings → Environment Variables**
3. Update `ANTHROPIC_API_KEY` with your key
4. Change `DEMO_MODE` to `false`
5. Click **Redeploy**

The app will automatically switch from Demo Mode to Live AI Mode.

---

## Project Structure

```
verifyid/
├── public/
│   └── index.html        ← Main app (all 10 screens)
├── api/
│   └── validate.js       ← Backend AI API
├── data/
│   └── depositors.json   ← 20 sample depositor records (editable)
├── vercel.json           ← Deployment config
└── README.md             ← This file
```

---

## Adding More Depositors

Open `data/depositors.json` in any text editor (Notepad, TextEdit) and add more records following this format:

```json
{
  "accountNumber": "ACC021234",
  "name": "Your Name Here",
  "mobile": "XXXXXX1234",
  "institution": "First National Financial Services",
  "natureOfAccount": "Single",
  "claimAmount": 350000,
  "ucic": "UCIC-1234-5678-9012",
  "claimNumber": "CLM2026002001",
  "hasMobile": true
}
```

---

## Need Help?
Contact your hackathon mentor or share the error message with your technical teammate.
