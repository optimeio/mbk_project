# MongoDB Atlas Connection Guide - MBK Carrierz Portal

## ⚠️ SECURITY ALERT

Your MongoDB credentials have been exposed. **IMMEDIATE ACTIONS REQUIRED:**

1. ✅ Go to [MongoDB Atlas Console](https://cloud.mongodb.com)
2. ✅ Reset your database password
3. ✅ Regenerate new connection string
4. ✅ Update `.env` file with new credentials
5. ✅ Never share credentials in chat/messages again

---

## Current MongoDB Configuration Status

### ✅ Already Configured in Project

Your backend is already set up with MongoDB connection! Here's what's in place:

**File:** `backend/config/database.mjs`

```javascript
// ✅ Features Already Implemented:
✓ Atlas URI connection support
✓ Local fallback (MongoDB on localhost:27017)
✓ Connection pooling (100 max connections)
✓ Automatic retry logic
✓ Error handling with offline mode support
✓ Credential redaction (doesn't log passwords)
✓ Connection state events
✓ Wire compression (zstd, snappy, zlib)
```

---

## Secure MongoDB Setup

### Step 1: Get Your MongoDB URI (Securely)

**Via MongoDB Atlas Console:**

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **"Connect"**
4. Choose **"Drivers"**
5. Select **Node.js** and version **5.x**
6. Copy the connection string (it will look like):

```
mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
```

### Step 2: Update `.env` File Securely

**File:** `C:\mbk_project\.env`

```env
# SECURE MongoDB Configuration
# ✅ Use Atlas URI (recommended for production)
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/dbname?retryWrites=true&w=majority

# ✅ Optional: Local MongoDB for development
# MONGO_URI_LOCAL=mongodb://localhost:27017/mbkcarrierz

# ✅ Allow offline mode in development (won't fail if DB is down)
ALLOW_OFFLINE=1

# ✅ Environment
NODE_ENV=development
```

**Replace:**
- `USERNAME` - Your MongoDB user
- `PASSWORD` - Your MongoDB password (URL-encoded if special chars)
- `cluster-name` - Your Atlas cluster name
- `dbname` - Your database name (usually `mbkcarrierz`)

### Step 3: URL Encode Password (If Special Characters)

If your password has special characters like `@`, `#`, `!`, etc.:

**Use an encoder:** https://www.urlencoder.org/

Or manually encode:
```
@ = %40
# = %23
! = %21
: = %3A
/ = %2F
```

Example:
```
Password: Mbk_7867@123
Encoded: Mbk_7867%40123

URI: mongodb+srv://sukhel:Mbk_7867%40123@ac-6rykvxg...
```

---

## MongoDB Connection Flow

```
┌─────────────────────────────────────────┐
│        Server Startup (server.mjs)      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Load .env file                         │
│  - MONGO_URI (Atlas)                   │
│  - MONGO_URI_LOCAL (optional)          │
│  - NODE_ENV (development/production)   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  connectToDatabase() called             │
│  (config/database.mjs)                 │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
  Is Local?       Use Atlas URI
  │                 │
  └─────┬───────────┘
        │
        ▼
  Try Mongoose Connect
  (with connection pool)
  │
  ├─→ Success ✅
  │   └─→ Ready for queries
  │
  ├─→ Failure ❌
  │   ├─→ Try local fallback
  │   └─→ If offline allowed, continue
  │
  └─→ Offline Mode
      └─→ Some APIs unavailable
```

---

## Connection Options Explained

Your backend uses these optimized settings:

```javascript
const connectOptions = {
  // Timeouts (in milliseconds)
  serverSelectionTimeoutMS: 5000,  // 5 second server discovery
  connectTimeoutMS: 5000,           // 5 second initial connect
  socketTimeoutMS: 45000,           // 45 second operation timeout
  
  // Connection Pooling
  maxPoolSize: 100,                 // Maximum connections per replica
  minPoolSize: 10,                  // Minimum active connections
  maxIdleTimeMS: 30000,            // Close unused connections after 30s
  
  // Monitoring
  heartbeatFrequencyMS: 10000,      // Check connection health every 10s
  
  // Performance
  compressors: ['zstd', 'snappy', 'zlib'],  // Wire compression
  retryWrites: true,                // Retry write operations
  retryReads: true,                 // Retry read operations
  w: 'majority',                    // Write to majority replicas
  autoIndex: false,                 // Don't auto-create indexes (production)
};
```

---

## Testing MongoDB Connection

### 1. Via Backend Server

```bash
# Start development server
cd C:\mbk_project\backend
npm install
npm run dev

# Watch console for:
✅ MongoDB connected successfully
```

### 2. Via Mongoose (Direct Test)

Create `test-mongodb.js`:

```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test write
    const testCollection = mongoose.connection.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Write test successful');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
```

Run: `node test-mongodb.js`

### 3. Via MongoDB Compass (GUI Tool)

1. Download: https://www.mongodb.com/products/compass
2. Click **"New Connection"**
3. Paste your URI
4. Click **"Connect"**
5. Browse collections

---

## Environment Configuration

### Development Setup

```env
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/mbkcarrierz
MONGO_URI_LOCAL=mongodb://localhost:27017/mbkcarrierz
ALLOW_OFFLINE=1
```

**Behavior:**
- ✅ Tries local MongoDB first
- ✅ Falls back to Atlas if local fails
- ✅ Can run without DB (ALLOW_OFFLINE=1)

### Production Setup

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://produser:prodpass@prod-cluster.mongodb.net/mbkcarrierz
ALLOW_OFFLINE=0
```

**Behavior:**
- ✅ Uses Atlas only (no local)
- ❌ Fails if DB unavailable (ALLOW_OFFLINE=0)

---

## Troubleshooting

### ❌ "Authentication failed"
**Solution:**
- Verify username and password
- Check password is URL-encoded
- Verify user has database access in Atlas

### ❌ "Cannot reach replica set"
**Solution:**
- Check IP whitelist in Atlas (Network Access)
- Add your IP: https://cloud.mongodb.com/v2/{project}/security/networkAccess
- Or allow all: `0.0.0.0/0` (development only)

### ❌ "Connection timeout"
**Solution:**
- Check internet connection
- Verify MongoDB cluster is running
- Check firewall rules
- Try with connection string from Atlas console

### ❌ "No databases available"
**Solution:**
- Database doesn't exist - create it in Atlas
- Or use any name - MongoDB will create on first write
- Default in project: `mbkcarrierz`

### ✅ "ALLOW_OFFLINE=1 but still failing"
**Solution:**
- App can run without MongoDB
- Some endpoints will fail (those needing database)
- Check specific error for which endpoint failed

---

## Connection String Examples

### Format
```
mongodb+srv://[username]:[password]@[cluster-url]/[database]?[options]
```

### Example 1: Basic Connection
```
mongodb+srv://myuser:mypassword@cluster0.mongodb.net/mydb?retryWrites=true&w=majority
```

### Example 2: With Special Characters (URL-encoded)
```
mongodb+srv://myuser:My%40Pass%23123@cluster0.mongodb.net/mydb
```

### Example 3: Local MongoDB
```
mongodb://localhost:27017/mbkcarrierz
```

### Example 4: Production
```
mongodb+srv://produser:ProdP@ssw0rd@prod-cluster-12345.mongodb.net/mbkcarrierz?retryWrites=true&w=majority&ssl=true
```

---

## Security Best Practices

✅ **DO:**
- Store credentials in `.env` file (never in code)
- Use strong passwords (min 16 characters)
- Enable IP whitelist in Atlas
- Use SCRAM-SHA-256 authentication
- Rotate credentials regularly (monthly)
- Use different credentials for dev/prod
- Keep `.env` file in `.gitignore`

❌ **DON'T:**
- Hardcode credentials in JavaScript
- Commit `.env` file to git
- Share credentials in chat/email
- Use same password for dev and prod
- Allow `0.0.0.0/0` in production IP list
- Leave database exposed without authentication

---

## Files to Update

### 1. Backend `.env` File
**Path:** `C:\mbk_project\backend\.env`

Update:
```env
MONGO_URI=mongodb+srv://[your-new-credentials]@[cluster].mongodb.net/mbkcarrierz
```

### 2. Root `.env` File
**Path:** `C:\mbk_project\.env`

Update:
```env
MONGO_URI=mongodb+srv://[your-new-credentials]@[cluster].mongodb.net/mbkcarrierz
```

### 3. Frontend API URL
**Path:** `C:\mbk_project\frontend\.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:5003
```

---

## Quick Start Checklist

- [ ] Reset MongoDB password in Atlas
- [ ] Copy new connection string
- [ ] Update `.env` files with new URI
- [ ] URL-encode password if special characters
- [ ] Add your IP to Atlas IP whitelist
- [ ] Test connection: `npm run dev`
- [ ] Check console logs for "✅ MongoDB connected"
- [ ] Delete any credentials from chat history
- [ ] Add `.env` to `.gitignore`

---

## Helpful Links

- MongoDB Atlas: https://cloud.mongodb.com
- Connection String Reference: https://docs.mongodb.com/manual/reference/connection-string/
- IP Whitelist Guide: https://docs.mongodb.com/atlas/security/ip-access-list/
- URL Encoder: https://www.urlencoder.org/
- MongoDB Compass: https://www.mongodb.com/products/compass

---

**Last Updated:** June 11, 2026  
**Status:** ✅ Connection Ready  
**Security Level:** Protected with `.env`
