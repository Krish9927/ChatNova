# Troubleshooting Guide

## ❌ Error: Port 3000 Already in Use

### Problem
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution

#### Option 1: Kill the Process (Recommended)

**Windows:**

1. **Using the batch script (Easiest):**
   ```bash
   cd backend
   kill-port-3000.bat
   ```

2. **Manual method:**
   ```bash
   # Find the process
   netstat -ano | findstr :3000
   
   # You'll see output like:
   # TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
   
   # Kill the process (replace 12345 with your PID)
   taskkill /F /PID 12345
   ```

3. **Then restart your server:**
   ```bash
   npm start
   ```

#### Option 2: Use a Different Port

Change the port in your `.env` file:

```env
PORT=3001
```

Then update your frontend axios configuration:
```javascript
// frontend/src/lib/axios.js
baseURL: import.meta.env.MODE === "development" ? "http://localhost:3001/api" : "/api",
```

---

## ❌ Error: Dashboard Endpoint Not Found (404)

### Problem
```
GET http://localhost:3000/api/dashboard 404 (Not Found)
```

### Solution

1. **Verify server is running with latest code:**
   ```bash
   cd backend
   npm start
   ```

2. **Check the dashboard route is registered:**
   Open `backend/src/server.js` and verify:
   ```javascript
   import dashboardRoutes from './routes/dashboard.route.js';
   // ...
   app.use("/api/dashboard", dashboardRoutes);
   ```

3. **Test the endpoint directly:**
   ```bash
   # After logging in, test:
   curl http://localhost:3000/api/dashboard
   ```

---

## ❌ Error: Cannot Read Property of Undefined

### Problem
```javascript
TypeError: Cannot read property 'fetchDashboard' of undefined
```

### Solution

Make sure the function is properly destructured from the store:

```javascript
const {
  friends, 
  pendingRequests, 
  sentRequests, 
  searchResults, 
  isSearching,
  fetchDashboard, // ✅ Make sure this is included
  searchUsers, 
  clearSearch,
  sendRequest, 
  acceptRequest, 
  rejectRequest,
} = useFriendStore();
```

---

## ❌ Error: Click on Contact Shows Error

### Problem
When clicking on a contact, an error appears in console.

### Common Causes & Solutions

#### 1. **Message Loading Error**

**Check console for:**
```
GET /api/messages/:userId 404
```

**Solution:** Verify the user ID is valid:
```javascript
// In ContactList.jsx
const handleOpenChat = (friend) => {
  console.log('Opening chat with:', friend); // Debug
  setSelectedGroup(null);
  setSelectedUser(friend);
};
```

#### 2. **Database Connection Issue**

**Check backend logs for:**
```
MongoDB connection error
PostgreSQL connection error
```

**Solution:**
```bash
# Verify .env file has correct credentials
cd backend
cat .env

# Check connections
MONGODB_URI=mongodb://localhost:27017/chatnova
DATABASE_URL=postgresql://user:password@localhost:5432/chatnova
```

#### 3. **Missing User Data**

**Error:** `Cannot read property '_id' of null`

**Solution:** Add null checks:
```javascript
const handleOpenChat = (friend) => {
  if (!friend || !friend._id) {
    console.error('Invalid friend object:', friend);
    return;
  }
  setSelectedGroup(null);
  setSelectedUser(friend);
};
```

---

## ❌ Error: Cache Issues - Seeing Old Data

### Problem
UI shows outdated information even after making changes.

### Solution

**Clear cache manually:**

1. **In browser console:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Or clear specific cache:**
   ```javascript
   localStorage.removeItem('chatNova_friendData');
   localStorage.removeItem('chatNova_chatPartners');
   localStorage.removeItem('chatNova_groups');
   location.reload();
   ```

3. **Or use the store method:**
   ```javascript
   // In browser console
   useFriendStore.getState().clearCache();
   useChatStore.getState().clearCache();
   useGroupStore.getState().clearCache();
   ```

---

## ❌ Error: CORS Issues

### Problem
```
Access to XMLHttpRequest has been blocked by CORS policy
```

### Solution

1. **Check backend CORS configuration:**
   ```javascript
   // backend/src/server.js
   app.use(cors({ 
     origin: ENV.CLIENT_URL, 
     credentials: true 
   }));
   ```

2. **Verify .env has correct CLIENT_URL:**
   ```env
   CLIENT_URL=http://localhost:5173
   ```

3. **Check axios configuration:**
   ```javascript
   // frontend/src/lib/axios.js
   export const axiosInstance = axios.create({
     baseURL: "http://localhost:3000/api",
     withCredentials: true, // Important!
   });
   ```

---

## ❌ Error: MongoDB/PostgreSQL Not Running

### Problem
```
MongoNetworkError: connect ECONNREFUSED
Error: connect ECONNREFUSED ::1:5432
```

### Solution

**Windows:**

1. **Start MongoDB:**
   ```bash
   # If using MongoDB service:
   net start MongoDB
   
   # Or manually:
   mongod --dbpath "C:\data\db"
   ```

2. **Start PostgreSQL:**
   ```bash
   # If using PostgreSQL service:
   net start postgresql-x64-14
   
   # Or check if it's running:
   psql --version
   ```

**Docker (Alternative):**
```bash
# Use docker-compose
docker-compose up -d
```

---

## ❌ Error: Redis Connection Failed

### Problem
```
Error: Redis connection failed
```

### Solution

1. **Start Redis:**
   ```bash
   # Windows (if installed):
   redis-server
   
   # Or using Docker:
   docker run -d -p 6379:6379 redis
   ```

2. **Check .env configuration:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

---

## 🔍 General Debugging Steps

### 1. Check All Services Are Running

```bash
# MongoDB
mongosh

# PostgreSQL
psql -U postgres

# Redis
redis-cli ping
# Should return: PONG
```

### 2. Check Backend Logs

```bash
cd backend
npm start

# Look for:
# ✅ MongoDB connected
# ✅ PostgreSQL connected
# ✅ Redis connected
# ✅ Server is running on port 3000
```

### 3. Check Frontend Console

Open browser DevTools (F12) → Console tab
Look for:
- Network errors (404, 500, etc.)
- JavaScript errors
- CORS errors

### 4. Check Network Requests

Open browser DevTools (F12) → Network tab
Verify:
- API calls are being made
- Responses are 200 OK
- Response data is correct

### 5. Verify Environment Variables

**Backend `.env`:**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatnova
DATABASE_URL=postgresql://user:password@localhost:5432/chatnova
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**Frontend:** Check `import.meta.env.MODE`

---

## 🆘 Still Having Issues?

### Enable Debug Mode

**Backend:**
```javascript
// In server.js, add more logging:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

**Frontend:**
```javascript
// In axios.js, add interceptors:
axiosInstance.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
});

axiosInstance.interceptors.response.use(response => {
  console.log('Response:', response);
  return response;
});
```

### Check Dependencies

```bash
# Backend
cd backend
npm list

# Frontend
cd frontend
npm list
```

### Restart Everything

```bash
# Kill all processes
# Windows:
taskkill /F /IM node.exe

# Then start fresh:
cd backend
npm start

# In another terminal:
cd frontend
npm run dev
```

---

## 📞 Common Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid data sent to API |
| 401 | Unauthorized | Not logged in or token expired |
| 403 | Forbidden | No permission for this action |
| 404 | Not Found | Endpoint or resource doesn't exist |
| 500 | Server Error | Backend crashed or database issue |

---

## ✅ Quick Checklist

Before reporting an issue, verify:

- [ ] All databases are running (MongoDB, PostgreSQL, Redis)
- [ ] Backend server is running on port 3000
- [ ] Frontend dev server is running
- [ ] No console errors in browser
- [ ] .env files are configured correctly
- [ ] Latest code is pulled/saved
- [ ] Dependencies are installed (`npm install`)
- [ ] Cache is cleared if seeing old data
- [ ] Port 3000 is not in use by another process

---

**Last Updated:** 2025-01-XX
