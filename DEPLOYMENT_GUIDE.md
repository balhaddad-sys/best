# 🚀 Quick Deployment Guide

This is a condensed deployment checklist for MedWard Master. For detailed instructions, see [README.md](README.md).

---

## ✅ Pre-Deployment Checklist

### Requirements
- [ ] Google account (for Apps Script)
- [ ] OpenAI API account with API key
- [ ] GitHub account with this repository
- [ ] Basic understanding of Git commands

---

## 📋 Step-by-Step Deployment

### STEP 1: Deploy Backend (5 minutes)

1. **Open Google Apps Script**
   - Go to: https://script.google.com
   - Click "New Project"
   - Rename: "MedWard-Backend"

2. **Add Code**
   - Delete default code
   - Copy entire contents of `backend/Code.gs`
   - Paste into editor

3. **Configure API Key** ⚠️ CRITICAL
   - Click ⚙️ (Project Settings)
   - Scroll to "Script Properties"
   - Add property:
     - Name: `OPENAI_API_KEY`
     - Value: `sk-...` (your OpenAI key)

4. **Enable Drive API**
   - Click "+" next to Services
   - Search "Drive API"
   - Add (Version v2)

5. **Deploy Web App**
   - Deploy > New deployment
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Click Deploy
   - **COPY THE URL** 📋

**Your Backend URL:**
```
https://script.google.com/macros/s/ABC123.../exec
```

---

### STEP 2: Configure Frontend (2 minutes)

1. **Update Backend URL**
   - Open `js/app.js` in this repository
   - Find line ~8 (CONFIG object)
   - Replace `YOUR_APPS_SCRIPT_URL_HERE` with your URL from Step 1

   ```javascript
   const CONFIG = {
     BACKEND_URL: 'https://script.google.com/macros/s/ABC123.../exec',
     APP_NAME: 'MedWard Master',
     VERSION: '1.0.0'
   };
   ```

2. **Save the file**

---

### STEP 3: Deploy to GitHub Pages (3 minutes)

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Deploy MedWard Master with backend configuration"
   git push origin claude/deploy-medward-master-sG8Pc
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Settings > Pages
   - Source: Deploy from branch
   - Branch: `claude/deploy-medward-master-sG8Pc` (or `main`)
   - Folder: `/ (root)`
   - Click Save

3. **Wait for Deployment** (1-2 minutes)
   - GitHub will build and deploy your site
   - Look for green checkmark ✅

4. **Access Your Site**
   ```
   https://[your-username].github.io/[repo-name]/
   ```

---

### STEP 4: Test Deployment (2 minutes)

1. **Open Your Site**
   - Visit your GitHub Pages URL

2. **Sign In**
   - Enter any username (e.g., "Dr. Test")
   - Click "Sign In"

3. **Test Text Analysis**
   - Paste sample text:
     ```
     Hemoglobin: 10.2 g/dL (Low)
     WBC: 7.5 K/uL (Normal)
     Platelets: 250 K/uL (Normal)
     ```
   - Select "Laboratory Results"
   - Click "Analyze Report"
   - Wait 5-10 seconds

4. **Check Results**
   - Should see Summary, Key Findings, etc.
   - If successful, ✅ deployment complete!

---

## 🐛 Quick Troubleshooting

### Error: "Backend URL not configured"
- ❌ You didn't update `js/app.js`
- ✅ Update `CONFIG.BACKEND_URL` in `js/app.js`
- ✅ Commit and push changes

### Error: "OpenAI API key not configured"
- ❌ API key not set in Apps Script
- ✅ Go to Apps Script > Settings > Script Properties
- ✅ Add `OPENAI_API_KEY` property

### Error: CORS or Network errors
- ❌ Wrong Apps Script URL
- ✅ Use the `/exec` URL (not `/dev`)
- ✅ Verify "Anyone" access in deployment settings

### Error: OCR fails
- ❌ Drive API not enabled
- ✅ Enable Drive API in Apps Script Services

### Site not loading (404)
- ❌ GitHub Pages not enabled or still deploying
- ✅ Wait 2-3 minutes after enabling Pages
- ✅ Check Settings > Pages for green checkmark

---

## 🔄 Updating After Deployment

### Update Backend (Apps Script)
1. Edit code in Apps Script editor
2. Deploy > Manage deployments
3. Click edit (pencil icon)
4. Version: New version
5. Deploy

**URL stays the same!** No frontend changes needed.

### Update Frontend
1. Edit files locally
2. Commit changes:
   ```bash
   git add .
   git commit -m "Update frontend"
   git push
   ```
3. Wait 1-2 minutes for GitHub Pages to redeploy

---

## 📞 Need Help?

1. **Check Console** (F12 in browser)
   - Look for red errors
   - Check Network tab for failed requests

2. **Check Apps Script Logs**
   - Apps Script > Executions
   - Look for errors in recent runs

3. **Review Full Documentation**
   - See [README.md](README.md) for detailed info

4. **Test Backend Directly**
   - Apps Script > Select `testInterpret`
   - Click Run (▶️)
   - Check execution log

---

## ✨ Success Indicators

You've successfully deployed when:

- ✅ GitHub Pages site loads without 404
- ✅ Login works (no backend URL error)
- ✅ Text analysis returns AI results
- ✅ Results display in formatted sections
- ✅ No console errors (F12)

---

## 🎉 What's Next?

After successful deployment:

1. **Test thoroughly** with different report types
2. **Share** with colleagues for feedback
3. **Monitor** OpenAI API usage and costs
4. **Consider** production security enhancements
5. **Review** data privacy and HIPAA requirements

---

**Total Deployment Time**: ~12 minutes

**Difficulty**: Beginner-Friendly ⭐⭐☆☆☆

**Support**: Open an issue in the GitHub repository

---

Last Updated: January 2026
