# 🚀 Start Your ChatNova Application

## Step-by-Step Startup Guide

### ✅ Step 1: Kill Existing Processes

**Windows:**
```bash
# Kill Node.js processes on port 3000
cd backend
kill-port-3000.bat

# OR manually kill all Node.js processes
taskkill /F /IM node.exe
```

---

### ✅ Step 2: Start Databases

#### MongoDB
```bash
# Check if MongoDB is running
mongosh

# If not running, start it:
# Option 1: Windows Service
net start MongoDB

# Option 2: Manual start
mongod --dbpath "C:\data\db"
```

#### PostgreSQL
```bash
# Check if PostgreSQL is running
psql --version

# If not running:
net start postgresql-x64-14
```

#### Redis
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running:
redis-server

# OR use Docker:
docker run -d -p 6379:6379 redis
```

---

### ✅ Step 3: Verify Environment Variables

**Check `backend/.env`:**
```bash
cd backend
type .env
```

**Should contain:**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatnova
DATABASE_URL=postgresql://user:password@localhost:5432/chatnova
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

### ✅ Step 4: Install Dependencies (if needed)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### ✅ Step 5: Start Backend Server

```bash
cd backend
npm start
```

**Look for these success messages:**
```
✅ MongoDB connected
✅ PostgreSQL dm_messages indexes verified
✅ Redis adapter attached
✅ Server is running on port 3000
```

**Common Issues:**

❌ **Port already in use:**
- Go back to Step 1 and kill processes

❌ **MongoDB connection error:**
- Make sure MongoDB is running (Step 2)
- Check MONGODB_URI in .env

❌ **PostgreSQL error:**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Run: `psql -U postgres` to test connection

❌ **Redis error:**
- Make sure Redis is running
- Check REDIS_URL in .env

---

### ✅ Step 6: Start Frontend

**Open a NEW terminal:**
```bash
cd frontend
npm run dev
```

**Should see:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### ✅ Step 7: Test the Application

1. **Open browser:** http://localhost:5173

2. **Open DevTools (F12):**
   - Go to Console tab
   - Should see no errors

3. **Test Login/Signup**

4. **Check Network Tab:**
   - Look for `GET /api/dashboard` request
   - Should return 200 OK
   - Response should contain: friends, pending, sent, chatPartners, groups

5. **Click on a contact:**
   - Should load messages
   - No "failed to load data" error

---

### ✅ Step 8: Verify Dashboard Endpoint

**Test directly with curl (after logging in):**

```bash
# First, login to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}" \
  -c cookies.txt

# Then test dashboard
curl -X GET http://localhost:3000/api/dashboard \
  -b cookies.txt
```

**Should return JSON with:**
```json
{
  "friends": [...],
  "pending": [...],
  "sent": [...],
  "chatPartners": [...],
  "groups": [...]
}
```

---

## 🐛 Troubleshooting

### Error: "Failed to load data" when clicking contact

**Check these in order:**

1. **Backend console:**
   ```
   Dashboard request received for user: 6xxx...
   Dashboard data fetched successfully: { friendsCount: 2, ... }
   ```

2. **Browser console (F12):**
   - Any red errors?
   - Network tab: Is `/api/dashboard` returning 200?

3. **If dashboard returns 404:**
   ```bash
   # Backend might not be running with latest code
   # Restart backend:
   cd backend
   # Kill existing: kill-port-3000.bat
   npm start
   ```

4. **If dashboard returns 401:**
   - You're not logged in
   - Token expired
   - Clear cookies and login again

5. **If dashboard returns 500:**
   - Check backend console for error details
   - Database connection issue
   - Check all databases are running

---

### Error: "Cannot GET /api/dashboard"

**This means the route is not registered. Check:**

1. **File exists:**
   ```bash
   dir backend\src\controllers\dashboard.controller.js
   dir backend\src\routes\dashboard.route.js
   ```

2. **Route is imported in server.js:**
   ```javascript
   import dashboardRoutes from './routes/dashboard.route.js';
   // ...
   app.use("/api/dashboard", dashboardRoutes);
   ```

3. **Restart backend** to load new routes

---

### Error: Database connection failed

**MongoDB:**
```bash
# Test connection
mongosh

# If fails, start MongoDB:
net start MongoDB
```

**PostgreSQL:**
```bash
# Test connection
psql -U postgres -d chatnova

# If fails, check if running:
# Services → PostgreSQL → Start
```

**Redis:**
```bash
# Test connection
redis-cli ping

# If fails, start Redis:
redis-server
```

---

### Clear Everything and Start Fresh

```bash
# 1. Kill all Node.js processes
taskkill /F /IM node.exe

# 2. Clear cache
# In browser console:
localStorage.clear()

# 3. Restart databases (if needed)
net start MongoDB
net start postgresql-x64-14
redis-server

# 4. Start backend
cd backend
npm start

# 5. Start frontend (new terminal)
cd frontend
npm run dev
```

---

## 📝 Quick Checklist

Before asking for help, verify:

- [ ] All processes on port 3000 are killed
- [ ] MongoDB is running and connected
- [ ] PostgreSQL is running and connected
- [ ] Redis is running and connected
- [ ] Backend shows "Server is running on port 3000"
- [ ] Frontend shows "Local: http://localhost:5173/"
- [ ] No console errors in browser (F12)
- [ ] Can login successfully
- [ ] Dashboard endpoint returns 200 (check Network tab)
- [ ] Files exist:
  - [ ] `backend/src/controllers/dashboard.controller.js`
  - [ ] `backend/src/routes/dashboard.route.js`
- [ ] Route is registered in `backend/src/server.js`

---

## 🎯 Expected Behavior After Setup

1. **App loads instantly** (from cache)
2. **Single API call** to `/api/dashboard` 
3. **Response time** < 300ms
4. **Clicking contacts** loads messages smoothly
5. **No errors** in console

---

## 📞 Still Not Working?

Share these details:

1. **Backend console output** (full)
2. **Browser console errors** (F12)
3. **Network tab** - screenshot of failed request
4. **Which step failed?**
5. **Error message** (exact text)

---

**Last Updated:** 2025-01-XX
