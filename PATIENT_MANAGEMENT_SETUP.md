# MedWard Master - Patient Management System Setup Guide

## Overview

This guide walks you through setting up the **Patient Management System** - a separate backend that connects to your Google Sheets for ward patient management.

### Two Separate Backends

Your MedWard Master application now has **TWO independent backends**:

1. **AI Analysis Backend** (existing) - For medical report interpretation using Claude AI
2. **Patient Management Backend** (new) - For Google Sheets ward management

---

## Part 1: Create Google Apps Script Backend

### Step 1.1: Create New Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Name it: `MedWard-PatientManager`
4. Delete the default `myFunction()` code

### Step 1.2: Copy Backend Code

1. Open the file `backend/patient-manager-backend.gs` in this repository
2. Copy **ALL** the code
3. Paste it into your new Apps Script project
4. Click **Save** (disk icon)

### Step 1.3: Configure Sheet ID

1. Open your Google Sheet containing patient data
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_PART/edit
                                          ↑
                                    This is your Sheet ID
   ```
3. In Apps Script, click the **gear icon** (Project Settings)
4. Scroll to **Script Properties**
5. Click **Add script property**
6. Set:
   - **Property**: `SHEET_ID`
   - **Value**: [Paste your Sheet ID]
7. Click **Save script properties**

### Step 1.4: Deploy as Web App

1. In Apps Script, click **Deploy** → **New deployment**
2. Click the gear icon next to "Select type"
3. Choose **Web app**
4. Configure deployment:
   - **Description**: Patient Manager API v1
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone**
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to MedWard-PatientManager (unsafe)**
9. Click **Allow**
10. **COPY THE DEPLOYMENT URL** - you'll need this next!

The URL will look like:
```
https://script.google.com/macros/s/AKfycby.../exec
```

---

## Part 2: Configure Frontend

### Step 2.1: Update index.html

1. Open `index.html` in your code editor
2. Find this line (around line 2647):
   ```javascript
   window.MEDWARD_PATIENT_API_URL = '';
   ```
3. Paste your deployment URL:
   ```javascript
   window.MEDWARD_PATIENT_API_URL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
4. Save the file

---

## Part 3: Deploy to GitHub Pages

### Step 3.1: Commit Changes

```bash
git add .
git commit -m "Add patient management system with Google Sheets integration"
git push origin claude/patient-management-backend-njo92
```

### Step 3.2: Test Your Deployment

1. Open your MedWard Master web app
2. Log in with your username
3. Click the **"Ward Patients"** tab
4. Click **"Refresh"** to load patients from your Google Sheet

---

## Part 4: Usage Guide

### Viewing Patients

- **All Patients**: Click "Ward Patients" tab → "Refresh"
- **Filter by Ward**: Use the "All Wards" dropdown
- **Filter by Doctor**: Use the "All Doctors" dropdown
- **Filter by Status**: Use the "All Status" dropdown (Chronic/Non-Chronic)

### Adding a Patient

1. Click **"Add Patient"** button
2. Fill in the form:
   - **Ward** (required): Select from dropdown
   - **Room/Bed**: e.g., "12-2"
   - **Patient Name** (required): Full name
   - **Diagnosis**: e.g., "CAP, AKI"
   - **Assigned Doctor**: Select from dropdown
   - **Status**: Chronic or Non-Chronic
3. Click **"Save Patient"**

### Editing a Patient

1. Find the patient card
2. Click **"Edit"** button
3. Update the information
4. Click **"Save Patient"**

### Removing a Patient

1. Find the patient card
2. Click **"Remove"** button
3. Confirm the deletion

---

## Part 5: Google Sheet Structure

Your Google Sheet should follow this structure:

### Expected Format

```
Row 1:  Ward A
Row 2:  [Room/Bed] | Patient name | Diagnosis | Assigned Doctor | Status
Row 3:  12-1        | John Doe     | CAP       | Dr. Smith       | Non-Chronic
Row 4:  12-2        | Jane Smith   | AKI       | Dr. Jones       | Chronic
Row 5:  (empty)
Row 6:  Ward B
Row 7:  [Room/Bed] | Patient name | Diagnosis | Assigned Doctor | Status
...
```

### Important Notes

1. **Ward headers** should be in Column A and contain "Ward", "ICU", or "ER"
2. **Patient rows** have data in columns A-E:
   - Column A: Room/Bed number
   - Column B: Patient name (REQUIRED)
   - Column C: Diagnosis
   - Column D: Assigned Doctor
   - Column E: Status (Chronic/Non-Chronic)
3. The backend looks for a sheet named **"Unit e"** by default (can be changed in backend code)

---

## Part 6: Troubleshooting

### Problem: "Patient API not configured" error

**Solution**: Make sure you've set `window.MEDWARD_PATIENT_API_URL` in index.html (line 2647)

### Problem: No patients showing up

**Solutions**:
1. Check that your Google Sheet has the correct format
2. Verify the SHEET_ID in Apps Script Project Settings
3. Make sure the sheet name is "Unit e" or update the backend code
4. Check browser console for errors (F12 → Console tab)

### Problem: "API call failed" error

**Solutions**:
1. Redeploy the Apps Script:
   - Go to Apps Script project
   - Click Deploy → Manage deployments
   - Click Edit (pencil icon)
   - Create new version
   - Copy new URL and update index.html
2. Check that "Who has access" is set to "Anyone"

### Problem: Changes not showing in Google Sheet

**Solutions**:
1. Click "Refresh" button to reload data
2. Check if you have edit permissions on the Google Sheet
3. Verify the deployment is set to "Execute as: Me"

---

## Part 7: Security Considerations

### Current Setup
- The backend is **publicly accessible** ("Anyone" can access)
- This is necessary for the web app to work from any device
- The backend only accesses YOUR specific Google Sheet (set via SHEET_ID)

### Best Practices
1. **Don't share your deployment URL publicly** - keep it in your index.html only
2. **Use a dedicated Google Sheet** - don't put sensitive data in the same sheet
3. **Monitor usage** - Check Apps Script execution logs periodically
4. **Rotate deployments** - Create new deployments if URL is compromised

### Optional: Add Authentication
If you want to add password protection:
1. Modify the backend to check for an API key in requests
2. Add the API key to frontend configuration
3. This requires custom code changes (not included in this setup)

---

## Part 8: Advanced Customization

### Change Sheet Name

If your sheet isn't named "Unit e", update this line in `backend/patient-manager-backend.gs`:

```javascript
// Line ~68
const sheet = ss.getSheetByName('YOUR_SHEET_NAME') || ss.getSheets()[0];
```

### Add More Fields

To add additional patient fields:

1. Update backend code to read/write additional columns
2. Update frontend form in `index.html` (patient modal section)
3. Update `patient-manager.js` to handle new fields

### Customize Ward Detection

To change how wards are detected, modify this section in backend:

```javascript
// Around line 100
if (lowerVal.includes('ward') || lowerVal === 'icu' || lowerVal === 'er') {
  // Add your custom ward identifiers here
}
```

---

## Part 9: Testing Checklist

- [ ] Backend deployed successfully
- [ ] SHEET_ID configured in Script Properties
- [ ] Frontend URL updated in index.html
- [ ] Can load patients by clicking "Refresh"
- [ ] Can add a new patient
- [ ] New patient appears in Google Sheet
- [ ] Can edit existing patient
- [ ] Changes reflect in Google Sheet
- [ ] Can delete patient
- [ ] Patient removed from Google Sheet
- [ ] Filters work correctly (Ward, Doctor, Status)

---

## Part 10: Support

### Error Messages

The system shows user-friendly error messages in the app. Common ones:

- **"Patient API not configured"** → Update `MEDWARD_PATIENT_API_URL` in index.html
- **"API call failed"** → Check Apps Script deployment and permissions
- **"Row index required"** → System error, try refreshing the patient list
- **"Patient name and ward required"** → Fill in required form fields

### Logs and Debugging

**Frontend Logs:**
- Open browser console (F12 → Console)
- Look for errors starting with `[PatientManager]`

**Backend Logs:**
- Go to Apps Script project
- Click **Executions** (left sidebar)
- View recent execution logs

---

## Summary

You now have a complete patient management system that:

- ✅ Connects to your Google Sheets
- ✅ Allows viewing patients by ward
- ✅ Supports adding/editing/deleting patients
- ✅ Works in real-time with your existing workflow
- ✅ Runs completely separate from the AI analysis backend
- ✅ Is accessible from any device with a web browser

**Next Steps:**
1. Test the system with your actual patient data
2. Train your team on how to use it
3. Monitor for any issues
4. Provide feedback for improvements

---

## Quick Reference

### Key Files

- `backend/patient-manager-backend.gs` - Google Apps Script backend
- `js/patient-manager.js` - Frontend patient management logic
- `index.html` - Main app with patient UI (lines 2433-2478 for patient section)

### Key Configuration

- **Backend URL**: `window.MEDWARD_PATIENT_API_URL` in index.html (line 2647)
- **Sheet ID**: Script Properties in Google Apps Script project
- **Sheet Name**: "Unit e" (default, can be changed in backend)

### Important Links

- Apps Script Console: [script.google.com](https://script.google.com)
- Your Google Sheet: [Find in your Google Drive]
- MedWard App: [Your GitHub Pages URL]

---

**Last Updated**: January 2026
**Version**: 1.0.0
