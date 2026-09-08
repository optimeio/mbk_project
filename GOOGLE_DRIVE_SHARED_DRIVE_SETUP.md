# 📚 Shared Drive Setup Guide for Production

If you encounter the quota error, follow these steps to set up a Shared Drive.

---

## ✅ Option 1: Shared Drive Setup (Recommended)

### Step 1: Create a Shared Drive

1. Go to [Google Drive](https://drive.google.com)
2. Click **New** → **Shared Drive**
3. Name it: `MBK Trainer Management`
4. Click **Create**
5. Copy the Shared Drive ID from the URL:
   ```
   https://drive.google.com/drive/u/0/folders/YOUR_SHARED_DRIVE_ID
   ```

### Step 2: Share with Service Account

1. Open the Shared Drive
2. Click **Share** button
3. Paste the service account email:
   ```
   mbk-google-drive26@mbk-project-2026.iam.gserviceaccount.com
   ```
4. Select **Editor** role
5. Click **Share**

### Step 3: Update Configuration

Edit `backend/.env`:

```env
GOOGLE_DRIVE_USE_SHARED_DRIVE=true
GOOGLE_DRIVE_SHARED_DRIVE_ID=YOUR_SHARED_DRIVE_ID_HERE
```

### Step 4: Verify Setup

Run tests:

```bash
cd backend
node tests/test-google-drive-integration.mjs
```

Expected output:
```
✅ All tests passed! Google Drive integration is working correctly.
💾 Auto-save to Google Drive is enabled and ready.
```

---

## ✅ Option 2: OAuth 2.0 Setup (Alternative)

### Step 1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select `mbk-project-2026`
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Select **Desktop application**
5. Download JSON file

### Step 2: Enable Domain-Wide Delegation

1. Go to **Service Accounts** in Google Cloud
2. Select your service account
3. Go to **Keys** tab
4. Add a new key (JSON format)
5. Go to **Details** tab
6. Check **Enable Google Workspace Domain-Wide Delegation**

### Step 3: Update Code

Modify `backend/services/googleDriveService.mjs` to use OAuth delegation:

```javascript
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
  ],
  subject: 'user@yourdomain.com', // Admin user
});
```

### Step 4: Test

```bash
npm test
```

---

## ⚠️ Troubleshooting

### Error: "Invalid Shared Drive ID"
- Verify the ID format (should be a long alphanumeric string)
- Make sure you copied it correctly from the Drive URL
- Try creating a new shared drive

### Error: "Permission Denied"
- Verify service account has Editor access to the shared drive
- Check that you shared with the correct email
- Try re-sharing the drive with the service account

### Error: "Shared Drive not found"
- Confirm the shared drive exists in Google Drive
- Verify the ID is correct
- Try refreshing the page and copying the ID again

### Uploads Still Failing
- Make sure `GOOGLE_DRIVE_USE_SHARED_DRIVE=true`
- Verify `GOOGLE_DRIVE_SHARED_DRIVE_ID` is set
- Restart the backend server
- Run tests again

---

## 🔄 Reverting to Standard Drive (Folders Only)

If you want to keep the folder structure but not upload files:

```env
GOOGLE_DRIVE_USE_SHARED_DRIVE=false
GOOGLE_DRIVE_SHARED_DRIVE_ID=
```

This will:
- ✅ Create all folder structures automatically
- ✅ Organize trainers, colleges, and days
- ❌ Not upload files (quota limitation)

Users can manually upload files via Google Drive web interface.

---

## 📊 Capacity & Limitations

### Shared Drive Benefits
- **Storage**: Unlimited (with Google Workspace)
- **Collaboration**: Full team access
- **Permissions**: Admin-controlled
- **Retention**: Files persist even if creator leaves

### Service Account with Personal Drive
- **Storage**: Limited to account quota
- **Problem**: Files lost if service account deleted
- **Recommendation**: Not suitable for production

---

## 🎯 Production Recommendations

| Scenario | Recommendation |
|----------|-----------------|
| **Team/Enterprise** | Use Shared Drive (Option 1) |
| **Small business** | Use Shared Drive (Option 1) |
| **Testing** | Folder structure only (no uploads) |
| **Personal project** | OAuth delegation (Option 2) |

---

## 📝 Quick Reference

**Shared Drive URL Pattern**:
```
https://drive.google.com/drive/u/0/folders/SHARED_DRIVE_ID
```

**Service Account Email**:
```
mbk-google-drive26@mbk-project-2026.iam.gserviceaccount.com
```

**Environment Variables**:
```env
# For Shared Drive
GOOGLE_DRIVE_USE_SHARED_DRIVE=true
GOOGLE_DRIVE_SHARED_DRIVE_ID=<ID_HERE>

# For Service Account (already configured)
GOOGLE_SERVICE_ACCOUNT_JSON=<ALREADY_SET>
GOOGLE_DRIVE_ROOT_FOLDER_ID=1Sy_OM3laf4VJBmsfamvIAHQMV7hYjPDl
```

---

## ✅ Verification Checklist

- [ ] Shared Drive created in Google Drive
- [ ] Service account has Editor access
- [ ] Shared Drive ID copied to .env
- [ ] `GOOGLE_DRIVE_USE_SHARED_DRIVE=true`
- [ ] Environment variables reloaded
- [ ] Backend restarted
- [ ] Tests passing (15/15)
- [ ] File uploads working

---

**Setup Time**: 5-10 minutes  
**Complexity**: Low  
**Result**: Production-ready auto-save to Google Drive ✅

For support, check [GOOGLE_DRIVE_INTEGRATION_REPORT.md](./GOOGLE_DRIVE_INTEGRATION_REPORT.md)
