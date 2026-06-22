# Performance & Error Handling Fixes - Testing Guide

## ✅ Quick Verification Checklist

### Backend Fixes
- [ ] **Async Error Wrapper**: Check `/backend/middleware/asyncErrorHandler.js` exists
- [ ] **Global Error Handler**: Check `/backend/middleware/globalErrorHandler.js` exists
- [ ] **Cache Logging**: Verify cache errors are logged to console (not silent)
- [ ] **DB Timeout**: Socket timeout reduced to 15s (check `database.mjs`)
- [ ] **Redis Retries**: Increased to 3 attempts (check `redis.js`)

### Frontend Fixes
- [ ] **API Client**: Check `/frontend/src/lib/apiClient.js` with 30s timeout
- [ ] **Error Boundary**: Check `/frontend/src/components/layout/GlobalErrorBoundary.jsx`
- [ ] **Loading Indicator**: Check `/frontend/src/components/layout/GlobalLoadingIndicator.jsx`
- [ ] **Runtime Guards**: Check `/frontend/src/lib/globalErrorHandlers.js`
- [ ] **CTA Button**: Timeout wrapper added (check `CTAButton.jsx`)
- [ ] **Query Retries**: Increased to 3 (check `QueryProvider.jsx`)
- [ ] **Mutation Timeouts**: Added to hook (check `useMutationWithToast.js`)
- [ ] **Providers Integration**: Error boundary & loading indicator added (check `Providers.jsx`)

---

## 🧪 Manual Testing Scenarios

### Scenario 1: Test Timeout Handling
**Goal**: Verify 30-second timeout works

**Steps**:
1. Open DevTools → Network tab
2. Click any CTA button that makes an API call
3. Throttle network: Settings → Slow 3G or Custom (very slow)
4. Click button
5. Wait 30+ seconds

**Expected**:
- ✅ Spinner shows with "Please Wait..."
- ✅ After 30s, error notification appears
- ✅ No infinite loading spinner
- ✅ Button becomes clickable again

---

### Scenario 2: Test Error Boundary
**Goal**: Verify error boundary catches errors

**Steps**:
1. Open browser console
2. Type: `throw new Error('Test error')`
3. Press Enter

**Expected**:
- ✅ Page shows error boundary fallback UI
- ✅ Shows error ID like "ERR-1234567890-abc123"
- ✅ "Try Again" and "Go Home" buttons visible
- ✅ No blank screen

---

### Scenario 3: Test Network Offline
**Goal**: Verify app handles offline gracefully

**Steps**:
1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Try to load a page or click a button

**Expected**:
- ✅ Shows "Request timeout" or network error
- ✅ Toast notification appears
- ✅ Error ID shown for debugging
- ✅ App doesn't crash

---

### Scenario 4: Test Slow Database Query
**Goal**: Verify socket timeout works

**Steps**:
1. Backend: Make a route handler with `setTimeout(15000)` (15+ second delay)
2. Frontend: Call that endpoint
3. Monitor response time

**Expected**:
- ✅ Request fails after ~15 seconds
- ✅ Error notification shown
- ✅ User can retry
- ✅ Server doesn't hang

---

### Scenario 5: Test CTA Button Double-Click Prevention
**Goal**: Verify debouncing and timeout

**Steps**:
1. Find a form with CTA button
2. Rapidly click button 5+ times
3. Monitor network tab

**Expected**:
- ✅ Only 1 request sent (not 5)
- ✅ Spinner shows
- ✅ Button disabled during request
- ✅ Response or timeout after 30s

---

### Scenario 6: Test Cache Logging
**Goal**: Verify cache errors are logged

**Steps**:
1. Stop Redis service (if running locally)
2. Make an API call
3. Check backend console logs

**Expected**:
- ✅ Warning in logs: "Redis write failed" or "Redis read failed"
- ✅ Request still succeeds (in-memory fallback)
- ✅ No silent errors

---

### Scenario 7: Test Query Retry
**Goal**: Verify 3-retry policy

**Steps**:
1. Throttle network to offline
2. Make an API call
3. Enable network after 1st attempt fails

**Expected**:
- ✅ Network tab shows 3 attempts
- ✅ Request succeeds on 2nd or 3rd attempt
- ✅ No error notification if it eventually succeeds

---

## 📊 Performance Metrics to Monitor

### Backend
```bash
# Check database connection timeout:
grep "socketTimeoutMS" backend/config/database.mjs
# Should show: socketTimeoutMS: 15000

# Check Redis retries:
grep "maxRetriesPerRequest" backend/config/redis.js
# Should show: maxRetriesPerRequest: 3
```

### Frontend
```bash
# Check query stale time:
grep "MASTER_DATA" frontend/src/shared/config/queryPolicies.js
# Should show: MASTER_DATA: 3 * 60_000

# Check query retries:
grep "failureCount < " frontend/app/QueryProvider.jsx
# Should show: failureCount < 3
```

---

## 🔍 Browser DevTools Checks

### Network Tab
- [ ] API requests have timeout (30s)
- [ ] Failed requests show error details
- [ ] Retried requests visible (up to 3 attempts)
- [ ] Cache headers visible (X-Cache: HIT/MISS)

### Console Tab
- [ ] No silent errors (check for cached errors)
- [ ] Performance warnings show when async > 100ms
- [ ] Global error handlers logged: "✅ Global error handlers installed"
- [ ] Runtime guards installed: "✅ Global error handlers installed"

### Performance Tab
- [ ] Loading indicator appears quickly (< 200ms)
- [ ] Button disables immediately on click
- [ ] No jank or stuttering during loads

---

## 📝 Deployment Checklist

Before deploying to production:

- [ ] **Backend**:
  - [ ] All route files wrapped with `asyncErrorHandler`
  - [ ] Global error handler added to `server.mjs`
  - [ ] Test with actual MongoDB connection
  - [ ] Test with Redis connection
  - [ ] Monitor error logs for issues

- [ ] **Frontend**:
  - [ ] Error boundary renders properly
  - [ ] Loading indicator appears and hides correctly
  - [ ] All CTA buttons have timeout behavior
  - [ ] API client timeout is appropriate (30s)
  - [ ] Global error handlers installed on startup

- [ ] **Testing**:
  - [ ] Test with prod-like latency (use DevTools throttling)
  - [ ] Test error scenarios (network failure, timeout, etc.)
  - [ ] Monitor real user errors (Google Analytics/Sentry)
  - [ ] Check browser console for any warnings

---

## ⚠️ Common Issues & Fixes

### Issue: "Please Wait" spinner never appears
**Fix**: Check GlobalLoadingIndicator is added to Providers.jsx

### Issue: Timeout happens but button still loading
**Fix**: Check withTimeout() properly calls .finally() to set asyncLoading = false

### Issue: Error boundary shows blank page
**Fix**: Make sure GlobalErrorBoundary is wrapping QueryProvider (not inside it)

### Issue: Cache errors still silent
**Fix**: Check console.warn() calls were added to cacheMiddleware.js

### Issue: Retries not working
**Fix**: Verify QueryProvider.jsx has `failureCount < 3` and `retry: shouldRetryQuery`

---

## 📞 Support

If issues persist:
1. Check error ID displayed to user
2. Search backend logs for error ID
3. Enable development mode for full stack traces
4. Review individual component logic for custom error handling

---

## 🎯 Next: Monitor in Production

Once deployed, monitor:
- [ ] Error rate (should decrease)
- [ ] Timeout rate (should be minimal, < 1%)
- [ ] Cache hit rate (monitor Redis)
- [ ] Average response time (should decrease)
- [ ] User satisfaction (fewer complaints about slowness)
