# MongoDB Connection - Setup Checklist & Quick Reference

## 🚨 IMMEDIATE ACTION REQUIRED

Your MongoDB credentials have been exposed in this chat session.

### Within 1 Hour:
- [ ] Go to https://cloud.mongodb.com/v2/{project}/security/database/access/users
- [ ] Click your user and select "Edit Password"
- [ ] Generate new password and save
- [ ] Copy new connection string
- [ ] Update all `.env` files with new credentials
- [ ] Restart backend server
- [ ] Verify connection works

---

## ✅ Current Backend Setup Status

**File:** `backend/config/database.mjs`

### Features Active:
- ✅ MongoDB Atlas support
- ✅ Fallback to local MongoDB
- ✅ Connection pooling (100 connections)
- ✅ Automatic retry logic
- ✅ Offline mode support
- ✅ Wire compression enabled
- ✅ Connection health monitoring

---

## 📝 Configuration Files

### Primary Files to Update:

| File | Purpose | Status |
|------|---------|--------|
| `C:\mbk_project\.env` | Root environment | ⚠️ Has exposed credentials |
| `C:\mbk_project\backend\.env` | Backend environment | ⚠️ Has exposed credentials |
| `C:\mbk_project\frontend\.env` | Frontend environment | ✅ Safe |

---

## 🔧 Step-by-Step Setup

### Step 1: Get New MongoDB URI

```
Go to: https://cloud.mongodb.com
1. Click your cluster
2. Click "CONNECT"
3. Click "Drivers"
4. Select Node.js (version 5.x)
5. COPY the connection string
```

**You'll get something like:**
```
mongodb+srv://USERNAME:PASSWORD@cluster-name.abc123.mongodb.net/dbname?retryWrites=true&w=majority
```

### Step 2: Edit `.env` Files

#### Root .env
**File:** `C:\mbk_project\.env`

Replace line 6:
```env
# OLD (REMOVE):
MONGO_URI=mongodb://sukhel:Mbk_7867@ac-6rykvxg...

# NEW (ADD):
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/mbkcarrierz?ssl=true&retryWrites=true&w=majority
```

Replace `USERNAME` and `PASSWORD` with actual values

#### Backend .env
**File:** `C:\mbk_project\backend\.env`

Do the same update as root `.env`

### Step 3: Test Connection

```bash
# From project root
cd C:\mbk_project\backend

# Start development server
npm run dev

# Watch for message:
# ✅ MongoDB connected successfully
```

---

## 🔐 Security Checklist

Essential security steps:

### BEFORE Going to Production:

- [ ] Reset all exposed passwords (MongoDB, Email, etc.)
- [ ] Generate strong session secret (32+ characters)
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Enable IP whitelist in MongoDB Atlas
- [ ] Disable ALLOW_OFFLINE in production
- [ ] Remove debug logs from .env
- [ ] Update CORS_ALLOWED_ORIGINS for production domains
- [ ] Set up SSL certificates
- [ ] Enable two-factor auth on MongoDB account
- [ ] Enable audit logs on MongoDB
- [ ] Test database backups

### File Security:

- [ ] Add `.env` to `.gitignore`
- [ ] Add `.env.local` to `.gitignore`
- [ ] Don't commit `.env.example` with real values
- [ ] Use `.env.example.secure` template instead
- [ ] Rotate credentials monthly (best practice)
- [ ] Use different credentials for dev/prod/staging

---

## 🧪 Testing Steps

### Quick Test (1 minute):

```bash
npm run dev

# Should see:
# 🔧 Loading env files...
# 🔌 Attempting MongoDB connection...
# ✅ MongoDB connected successfully
```

### Detailed Test (5 minutes):

```javascript
// Create test-db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!');
    
    // Test collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
};

testDB();
```

Run: `node test-db.js`

---

## 🐛 Common Issues & Fixes

### Issue 1: "Authentication failed"
```
❌ Error: Authentication failed
```

**Solution:**
```
1. Check MongoDB username/password in URI
2. Verify password is URL-encoded
3. Ensure user exists in MongoDB
4. Check user has database access
```

### Issue 2: "Cannot connect to replica set"
```
❌ Error: getaddrinfo ENOTFOUND cluster0.mongodb.net
```

**Solution:**
```
1. Add your IP to MongoDB Atlas IP whitelist
2. Go to: https://cloud.mongodb.com/v2/{project}/security/networkAccess
3. Click "Add IP Address"
4. Enter your IP or use 0.0.0.0/0 for dev
```

### Issue 3: "Connection timeout"
```
❌ Error: Timeout waiting for server
```

**Solution:**
```
1. Check internet connection
2. Verify MongoDB cluster is running
3. Try connection string from MongoDB console
4. Check firewall is not blocking port 27017
```

### Issue 4: "Offline mode enabled"
```
⚠️ Continuing without MongoDB (offline mode enabled)
```

**This is OK for development:**
```
✅ Normal if ALLOW_OFFLINE=1 and no DB available
❌ In production: ALLOW_OFFLINE must be 0
```

---

## 📊 Connection Pool Settings

Current configuration (already optimized):

```javascript
{
  maxPoolSize: 100,           // Max connections per replica
  minPoolSize: 10,            // Min active connections  
  maxIdleTimeMS: 30000,       // Close idle after 30s
  serverSelectionTimeoutMS: 5000,  // Discovery timeout
  connectTimeoutMS: 5000,     // Initial connect timeout
  socketTimeoutMS: 45000,     // Operation timeout
  heartbeatFrequencyMS: 10000, // Health check every 10s
  retryWrites: true,          // Auto-retry writes
  retryReads: true,           // Auto-retry reads
}
```

**For different scales:**
- Small app: maxPoolSize=10, minPoolSize=2
- Medium app: maxPoolSize=50, minPoolSize=5 (current good middle ground)
- Large app: maxPoolSize=100, minPoolSize=10 (current)
- Enterprise: maxPoolSize=500+, minPoolSize=50+

---

## 🚀 Production Deployment

### MongoDB Atlas Setup for Production:

1. **Create Production Cluster**
   - Region: Choose closest to users
   - Tier: M10 or higher
   - Enable backups
   - Enable encryption at rest

2. **Configure Access Control**
   - Create separate production user
   - Set strong password (24+ chars)
   - Restrict to specific IPs only
   - Enable audit logging

3. **Set Environment Variables**
   ```env
   NODE_ENV=production
   MONGO_URI=mongodb+srv://prod_user:prod_pass@prod-cluster.mongodb.net/mbkcarrierz
   ALLOW_OFFLINE=0  # CRITICAL: Fail if DB unavailable
   ```

4. **Enable Monitoring**
   - Set up Atlas alerts
   - Monitor connection pool
   - Watch query performance
   - Set up automated backups

---

## 📚 Quick Reference Commands

### Connection String Format:
```
mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?[options]
```

### Test Connection:
```bash
npm run dev
# Watch for: ✅ MongoDB connected successfully
```

### View Logs:
```bash
# Check backend logs
tail -f C:\mbk_project\backend\logs\app.log

# Or on Windows:
Get-Content C:\mbk_project\backend\logs\app.log -Tail 50 -Wait
```

### Reset Connection:
```bash
# Kill process
# Ctrl+C in terminal

# Check .env is correct
cat C:\mbk_project\.env | grep MONGO_URI

# Restart
npm run dev
```

---

## ✨ Next Steps After Setup

1. ✅ Verify MongoDB connection works
2. ✅ Check collections are created
3. ✅ Test API endpoints with database
4. ✅ Monitor connection pool usage
5. ✅ Set up automated backups
6. ✅ Enable audit logging
7. ✅ Document connection settings
8. ✅ Train team on security practices

---

## 🔗 Useful Links

| Resource | Link |
|----------|------|
| MongoDB Atlas | https://cloud.mongodb.com |
| Connection String Docs | https://docs.mongodb.com/manual/reference/connection-string/ |
| IP Whitelist Guide | https://docs.mongodb.com/atlas/security/ip-access-list/ |
| URL Encoder | https://www.urlencoder.org/ |
| MongoDB Compass | https://www.mongodb.com/products/compass |
| Node.js Driver | https://docs.mongodb.com/drivers/node/ |

---

## 📞 Support

If connection fails:

1. Check `.env` file for correct URI
2. Verify MongoDB cluster is running
3. Confirm user/password are correct
4. Check IP is whitelisted
5. Review server logs for error message
6. Test with MongoDB Compass
7. Contact MongoDB support if needed

---

**Status:** ⚠️ Credentials Exposed - Action Required  
**Last Updated:** June 11, 2026  
**Priority:** 🔴 HIGH - Security Issue
