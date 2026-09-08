# MongoDB Connection Setup - Complete Documentation

## 📋 Overview

Your MBK Carrierz Portal backend is **already fully configured** for MongoDB connections. This guide helps you:

1. ✅ Securely set up credentials
2. ✅ Test the connection
3. ✅ Deploy to production safely
4. ✅ Handle common issues

---

## ⚠️ SECURITY ALERT

**Your MongoDB credentials are exposed in this chat session.**

### Action Items (Do Today):
1. **Reset MongoDB Password** → https://cloud.mongodb.com
2. **Copy New Connection String**
3. **Update `.env` Files**
4. **Restart Backend Server**
5. **Verify Connection Works**

---

## 📚 Documentation Structure

### Quick Start (5 min)
👉 **Read:** `MONGODB_QUICK_START.md`
- Immediate setup steps
- Common issues & fixes
- Testing checklist

### Complete Setup (15 min)
👉 **Read:** `MONGODB_SETUP_GUIDE.md`
- Detailed configuration
- Security best practices
- Production deployment
- Connection string examples

### Architecture Reference
👉 **Read:** Backend code: `config/database.mjs`
- Connection pooling settings
- Error handling logic
- Fallback mechanisms

---

## 🎯 What's Already Configured

### Backend Features (✅ Already Working)

```javascript
✅ MongoDB Atlas Support
   - Cloud-based database connection
   - SSL/TLS encryption
   - Automatic failover

✅ Local MongoDB Fallback
   - Development support
   - localhost:27017
   - Automatic fallback if Atlas fails

✅ Connection Pooling
   - 100 max connections per replica
   - 10 minimum active connections
   - Intelligent connection recycling

✅ Automatic Retry Logic
   - Retry writes: enabled
   - Retry reads: enabled
   - Exponential backoff

✅ Monitoring & Health Checks
   - Connection state events
   - Heartbeat monitoring (10s)
   - Automatic reconnection

✅ Error Handling
   - Graceful degradation
   - Offline mode support (dev)
   - Detailed error logging

✅ Performance Optimization
   - Wire compression (zstd/snappy)
   - Write concern: majority
   - Socket timeout: 45s
```

### Current Connection Status

**File:** `backend/config/database.mjs` (Lines 16-127)

**Features:**
- ✅ Redacts credentials in logs
- ✅ Probes local MongoDB availability
- ✅ Falls back gracefully
- ✅ Supports offline mode for development
- ✅ Comprehensive logging

---

## 🔑 Environment Variables

### Required Variables

```env
# Primary MongoDB connection (Atlas)
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/dbname

# Optional local fallback
MONGO_URI_LOCAL=mongodb://localhost:27017/mbkcarrierz

# Development mode
ALLOW_OFFLINE=1
NODE_ENV=development
```

### Hierarchy

```
1. Check MONGO_URI (Atlas) - preferred
2. Check MONGO_URI_LOCAL (Local) - fallback
3. If NODE_ENV != production and no URI: offline mode (if allowed)
4. If NODE_ENV === production and no URI: fail startup
```

---

## 🚀 Three-Step Setup

### Step 1: Get Connection String (2 min)

```
1. Go to: https://cloud.mongodb.com
2. Select your cluster
3. Click "CONNECT"
4. Choose "Drivers"
5. Select "Node.js 5.x"
6. COPY the string
```

**Example:**
```
mongodb+srv://sukhel:PASSWORD@ac-6rykvxg.mongodb.net/mbkcarrierz?ssl=true&retryWrites=true&w=majority
```

### Step 2: Update `.env` Files (2 min)

**File 1:** `C:\mbk_project\.env`
```env
MONGO_URI=mongodb+srv://sukhel:PASSWORD@ac-6rykvxg.mongodb.net/mbkcarrierz
```

**File 2:** `C:\mbk_project\backend\.env`
```env
MONGO_URI=mongodb+srv://sukhel:PASSWORD@ac-6rykvxg.mongodb.net/mbkcarrierz
```

Replace `sukhel` and `PASSWORD` with actual values

### Step 3: Test Connection (1 min)

```bash
cd C:\mbk_project\backend
npm run dev

# Watch for:
# ✅ MongoDB connected successfully
```

---

## 🧪 Verification

### Check 1: Console Logs
```
✅ Expected in console:
   🔌 Attempting MongoDB connection…
   ✅ MongoDB pool connected
   ✅ MongoDB connected successfully
```

### Check 2: API Test
```bash
# Try an API that needs the database
curl http://localhost:5003/api/users

# Should work without "no database" errors
```

### Check 3: MongoDB Atlas
```
1. Go to: https://cloud.mongodb.com
2. Select your cluster
3. View "Metrics" tab
4. Should see "Connections" activity
```

---

## 🔐 Security Guide

### Development
```env
NODE_ENV=development
ALLOW_OFFLINE=1
MONGO_URI=mongodb+srv://devuser:devpass@cluster.mongodb.net/mbkcarrierz
MONGO_URI_LOCAL=mongodb://localhost:27017/mbkcarrierz
```

**Allows:**
- ✅ App runs without database
- ✅ Try local MongoDB first
- ✅ Fall back to cloud

### Production
```env
NODE_ENV=production
ALLOW_OFFLINE=0
MONGO_URI=mongodb+srv://produser:prodpass@prod-cluster.mongodb.net/mbkcarrierz
```

**Requires:**
- ✅ Database must be available
- ✅ Production cluster only
- ✅ Strong credentials
- ✅ IP whitelist configured

---

## 🛠️ Troubleshooting Quick Reference

| Problem | Cause | Solution |
|---------|-------|----------|
| Auth failed | Wrong credentials | Check username/password in MongoDB console |
| Connect timeout | IP not whitelisted | Add your IP to MongoDB Atlas IP list |
| Cannot reach replica | Network issue | Check internet, firewall |
| No databases | DB doesn't exist | Create database or use any name |
| Offline mode | No connection | Set ALLOW_OFFLINE=1 (dev only) |

---

## 📊 Monitoring

### Check Connection Pool

```javascript
// In backend code
mongoose.connection.on('connected', () => {
  console.log('✅ Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error:', err);
});
```

### View in MongoDB Atlas

```
1. Go to https://cloud.mongodb.com
2. Select cluster
3. View "Metrics" tab
4. Monitor:
   - Active connections
   - Operations per second
   - Average latency
```

---

## 📞 Getting Help

### MongoDB Official Resources
- Docs: https://docs.mongodb.com
- Driver: https://docs.mongodb.com/drivers/node
- Atlas: https://docs.atlas.mongodb.com

### Debugging Steps

1. **Check environment variables**
   ```bash
   echo $MONGO_URI  # On Linux/Mac
   echo %MONGO_URI% # On Windows
   ```

2. **Test connection string**
   - Use MongoDB Compass
   - Download: https://www.mongodb.com/products/compass
   - Paste connection string directly

3. **Check server logs**
   ```bash
   npm run dev 2>&1 | grep -i mongodb
   ```

4. **Verify IP whitelist**
   - MongoDB Atlas → Security → Network Access
   - Should see your IP in the list

---

## ✅ Final Checklist

Before going to production:

- [ ] All exposed credentials have been reset
- [ ] New connection string saved in `.env`
- [ ] MongoDB connection test passed (✅ in console)
- [ ] ALLOW_OFFLINE=0 set in production
- [ ] NODE_ENV=production set
- [ ] IP whitelist configured for production servers
- [ ] Backups enabled in MongoDB Atlas
- [ ] Monitoring set up
- [ ] Team trained on security practices
- [ ] `.env` added to `.gitignore`

---

## 📖 Related Documentation

In this project, see:
- `REGISTRATION_FIX_SUMMARY.md` - Registration button fixes
- `REGISTRATION_QUICK_REFERENCE.md` - Navigation implementation
- `REGISTRATION_ARCHITECTURE.md` - Technical deep dive
- `.env.example.secure` - Environment template

---

## 🎓 Learning Resources

### MongoDB Basics
- https://university.mongodb.com/courses/M001
- https://docs.mongodb.com/manual

### Node.js Driver
- https://docs.mongodb.com/drivers/node/current
- https://www.npmjs.com/package/mongoose

### Mongoose (ORM)
- https://mongoosejs.com/docs
- https://mongoosejs.com/docs/guide

---

## 🚨 Important Notes

### Connection String Format
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE
```

### Special Characters in Password
If password has `@`, `#`, `!`, etc:
1. Use URL encoder: https://www.urlencoder.org
2. Example: `Mbk@123` → `Mbk%40123`

### Multiple Environments
- Development: Local or dev cluster
- Staging: Separate staging cluster
- Production: Production cluster
- Never use same credentials across environments

---

## 🔄 Connection Flow

```
Server Start
    ↓
Load .env variables
    ↓
Read MONGO_URI
    ↓
Initialize mongoose
    ↓
Connect to MongoDB
    ↓
Setup connection pool
    ↓
Ready for database queries
```

---

**Status:** ⚠️ Security Action Required  
**Updated:** June 11, 2026  
**Priority:** 🔴 HIGH

---

For immediate setup, follow `MONGODB_QUICK_START.md`
