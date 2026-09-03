# Fix: "Failed to load data" When Clicking Contact

## 🎯 The Problem

When you click on a contact, you get "Failed to load data" error. This happens because the app is trying to load messages from PostgreSQL, but something is failing.

---

## 🔍 Step 1: Check What's Failing

### Open Browser DevTools (F12)

1. Go to **Network** tab
2. Click on a contact
3. Look for `/api/messages/[some-id]` request
4. Check the status code:

- **404 Not Found** → Backend route issue
- **500 Internal Server Error** → Database issue  
- **401 Unauthorized** → Not logged in
- **No request at all** → Frontend issue

---

## 🛠️ Step 2: Check Backend Logs

When you click a contact, your backend console should show:

```
getMessagesByUserId called: { myId: '...', otherId: '...' }
Found X messages between ... and ...
```

**If you don't see this**, the request isn't reaching the backend.

**If you see an error instead**, note what it says (see Step 3).

---

## ⚡ Step 3: Common Errors & Solutions

### Error: "relation \"dm_messages\" does not exist"

**Problem:** PostgreSQL table is missing

**Solution:**
```bash
# The table should be created automatically when starting the server
# Restart your backend:
cd backend
npm start

# Look for: "PostgreSQL dm_messages indexes verified"
```

If still not working, create it manually:
```bash
psql -U postgres -d chatnova

CREATE TABLE IF NOT EXISTS dm_messages (
  id SERIAL PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  group_id TEXT,
  text TEXT,
  image TEXT,
  audio TEXT,
  sticker TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dm_sender ON dm_messages(sender_id);
CREATE INDEX idx_dm_receiver ON dm_messages(receiver_id);
CREATE INDEX idx_dm_group ON dm_messages(group_id);
```

---

### Error: "connect ECONNREFUSED" or "Connection refused"

**Problem:** PostgreSQL is not running

**Solution:**

**If using Docker:**
```bash
docker-compose up -d
```

**If using local PostgreSQL:**
```bash
# Windows:
net start postgresql-x64-14

# Or check Services app:
# Services → PostgreSQL → Start
```

**Test connection:**
```bash
psql -U postgres
# Should open PostgreSQL prompt

# Then:
\l          # List databases
\c chatnova # Connect to chatnova
\dt         # List tables (should see dm_messages)
```

---

### Error: "password authentication failed"

**Problem:** Wrong database credentials

**Solution:**

Check `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/chatnova
```

Make sure:
- Username is correct (usually `postgres`)
- Password matches your PostgreSQL password
- Database name is correct (`chatnova`)
- Port is correct (default: `5432`)

---

### Error: "database \"chatnova\" does not exist"

**Problem:** Database not created

**Solution:**
```bash
psql -U postgres

CREATE DATABASE chatnova;
\q

# Then restart backend
cd backend
npm start
```

---

## 🧪 Step 4: Test PostgreSQL Manually

Run this test script I created:

```bash
cd backend
node test-postgres.js
```

This will tell you exactly what's wrong:
- ✅ Connection works
- ✅ Table exists
- ✅ Can query data
- ❌ What failed and how to fix it

---

## 🐋 If Using Docker

### Check if containers are running:
```bash
docker ps
```

Should see:
- PostgreSQL container
- MongoDB container
- Redis container (if using)

### If not running:
```bash
docker-compose up -d
```

### Check logs:
```bash
docker-compose logs postgres
```

### Connect to PostgreSQL in Docker:
```bash
docker exec -it <postgres-container-name> psql -U postgres -d chatnova
```

---

## ✅ Step 5: Verify the Fix

After fixing, do this:

1. **Restart backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Look for these logs:**
   ```
   ✅ MongoDB connected
   ✅ PostgreSQL dm_messages indexes verified
   ✅ Redis adapter attached
   ✅ Server is running on port 3000
   ```

3. **Refresh your browser** (clear cache: Ctrl+Shift+R)

4. **Click on a contact**

5. **Check backend logs:**
   ```
   getMessagesByUserId called: { myId: '...', otherId: '...' }
   Found 0 messages between ... and ...
   ```
   (0 messages is fine if you haven't chatted yet!)

6. **Check browser Network tab:**
   - `/api/messages/xxx` should return **200 OK**
   - Response should be an array (even if empty: `[]`)

---

## 🔧 Quick Fix Commands

**Reset everything and start fresh:**

```bash
# 1. Kill backend
taskkill /F /IM node.exe

# 2. Start databases
# Docker:
docker-compose up -d

# Or local:
net start MongoDB
net start postgresql-x64-14
redis-server

# 3. Restart backend
cd backend
npm start

# 4. Clear browser cache and refresh
# In browser: Ctrl+Shift+R
```

---

## 🎯 Expected Result

After clicking a contact:

**Backend logs:**
```
getMessagesByUserId called: { myId: '67...', otherId: '67...' }
Found 0 messages between 67... and 67...
```

**Browser Network tab:**
```
GET /api/messages/67abc123...
Status: 200 OK
Response: []
```

**UI:**
- Shows "No messages yet" placeholder
- No errors
- You can send a message

---

## 📞 Still Not Working?

Share these details:

1. **What does `node test-postgres.js` output say?**

2. **Backend console output** (full, including errors)

3. **Browser DevTools:**
   - Console errors
   - Network tab: failed request details

4. **Are you using Docker or local PostgreSQL?**

5. **Does `psql -U postgres` work?**

---

**Last Updated:** 2025-01-XX
