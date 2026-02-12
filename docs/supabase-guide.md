# 🗄️ Supabase Integration - Complete Guide

**Setup time:** 2 dias (inclui migração de dados)  
**ROI:** $5,000/year (managed DB + auth + storage + realtime)  
**Free tier:** 500 MB DB, unlimited API requests, 1 GB storage

---

## 🎯 What is Supabase?

Supabase is **Firebase for Postgres**. It gives you:
- 🗄️ **PostgreSQL** database (managed, scalable)
- 🔐 **Authentication** (OAuth, JWT, Magic Links, MFA)
- 📁 **Storage** (S3-compatible, for avatars/files)
- ⚡ **Realtime** (WebSocket subscriptions)
- 🎨 **Admin UI** (manage data visually)
- 🔒 **Row Level Security** (RLS)

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Create Supabase Project

1. **Sign up:** https://supabase.com
2. **Create project:**
   - Name: `OpenCell Production`
   - Region: `us-east-1` (ou mais próximo)
   - Database password: (guardar com segurança)
   - Wait ~2 minutes for provisioning

3. **Get credentials:**
   - Dashboard → Settings → API
   - Copy:
     - `URL`: `https://xxx.supabase.co`
     - `anon (public)`: `eyJxxx...`

### Step 2: Deploy Schema

1. **Open SQL Editor:**
   - Dashboard → SQL Editor → New Query

2. **Copy schema:**
   ```bash
   cat migrations/supabase/001_initial_schema.sql
   ```

3. **Paste and Run**
   - Click "Run" (ou `Ctrl + Enter`)
   - Should complete in ~5 seconds
   - Check: "Success. No rows returned"

4. **Verify tables:**
   - Dashboard → Table Editor
   - Should see: `bots`, `conversations`, `bot_analytics`, `user_profiles`, etc.

### Step 3: Create Storage Buckets

1. **Dashboard → Storage → New Bucket**

2. **Create 3 buckets:**

**Bucket 1: bot-avatars** (public)
- Name: `bot-avatars`
- Public: ✅ Yes
- File size limit: 5 MB
- Allowed MIME types: `image/png, image/jpeg, image/gif`

**Bucket 2: conversation-logs** (private)
- Name: `conversation-logs`
- Public: ❌ No
- File size limit: 10 MB

**Bucket 3: user-uploads** (private)
- Name: `user-uploads`
- Public: ❌ No
- File size limit: 10 MB

### Step 4: Configure OpenCell

Add to `.env`:
```bash
SUPABASE_ENABLED=true
SUPABASE_URL=https://xxx.supabase.co  # Your project URL
SUPABASE_ANON_KEY=eyJxxx...  # Your anon key
```

### Step 5: Test Connection

```bash
npm run build
npm start

# Check logs:
# [Supabase] Initialized successfully ✅
```

---

## 📦 Database Schema

### Tables Created:

1. **`user_profiles`** - Extended user info
   - Links to `auth.users`
   - Platform info (discord, slack, etc.)
   - Subscription tier
   - RLS: Users see only their own profile

2. **`bots`** - Bot configurations
   - name, type, tools, config
   - owner_id → auth.users
   - RLS: Users manage only their bots

3. **`conversations`** - Chat history
   - messages (JSONB)
   - bot_id, user_id, platform
   - RLS: Users see only their conversations

4. **`bot_analytics`** - Usage metrics
   - requests_count, total_cost, latency
   - Grouped by bot + date
   - RLS: Users see analytics for their bots

5. **`memories`** - For semantic search
   - content, embedding (vector)
   - For Pinecone-like functionality
   - RLS: Users see only their memories

6. **`user_roles`** - Admin/Support roles
   - RLS: Only admins can manage

---

## 🔐 Authentication

### Sign Up

```typescript
import { supabase } from './database/supabase';

// Email/Password
const { data, error } = await supabase.signUp(
  'user@example.com',
  'password123',
  { full_name: 'John Doe' }
);

// Returns: { user, session }
```

### Sign In

```typescript
// Email/Password
const { data, error } = await supabase.signIn(
  'user@example.com',
  'password123'
);

// OAuth (Google, GitHub, Discord)
const { data, error } = await supabase.signInWithOAuth('google');
// Redirects to Google → Callback → Session created
```

### Verify User (API endpoints)

```typescript
import { requireAuth } from './middleware/auth';

app.get('/api/bots', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;  // Verified user ID
  // ... fetch user's bots
});
```

---

## 📁 Storage

### Upload Bot Avatar

```typescript
// From file
const avatarUrl = await supabase.uploadBotAvatar(
  'my-bot',
  fileBuffer
);

// Returns: https://xxx.supabase.co/storage/v1/object/public/bot-avatars/my-bot.png
```

### Upload Generic File

```typescript
const url = await supabase.uploadFile(
  'user-uploads',
  `${userId}/document.pdf`,
  fileBuffer,
  {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,  // Overwrite if exists
  }
);
```

### Get File URL

```typescript
const url = supabase.getFileUrl('bot-avatars', 'my-bot.png');
// https://xxx.supabase.co/storage/v1/object/public/bot-avatars/my-bot.png
```

### Delete File

```typescript
await supabase.deleteFile('user-uploads', `${userId}/old-file.pdf`);
```

---

## ⚡ Realtime Subscriptions

### Subscribe to Bot Changes

```typescript
// Frontend (React example)
useEffect(() => {
  const channel = supabase.subscribeToBots(userId, (payload) => {
    console.log('Bot changed:', payload);
    // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    // payload.new: new row data
    // payload.old: old row data (for UPDATE/DELETE)
    
    // Update UI
    if (payload.eventType === 'INSERT') {
      setBots(prev => [...prev, payload.new]);
    }
  });

  return () => {
    supabase.unsubscribe(channel);
  };
}, [userId]);
```

### Custom Subscription

```typescript
const channel = supabase.subscribeToTable(
  'conversations',
  (payload) => {
    console.log('New conversation:', payload.new);
    // Update UI in real-time
  },
  { column: 'user_id', value: userId }  // Filter
);
```

---

## 🔌 API Endpoints

### Bots API

Created in `src/api/bots-api.ts`:

**List bots:**
```bash
GET /api/bots
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": [...],
  "count": 5
}
```

**Create bot:**
```bash
POST /api/bots
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "my-bot",
  "type": "agent",
  "tools": ["bash", "read"],
  "config": {}
}

# Response:
{
  "success": true,
  "data": { "id": "...", "name": "my-bot", ... }
}
```

**Get bot:**
```bash
GET /api/bots/my-bot
Authorization: Bearer <token>
```

**Update bot:**
```bash
PUT /api/bots/my-bot
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "paused",
  "tools": ["bash", "read", "write"]
}
```

**Delete bot:**
```bash
DELETE /api/bots/my-bot
Authorization: Bearer <token>
```

**Get analytics:**
```bash
GET /api/bots/my-bot/analytics?days=30
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": [
    { "date": "2025-02-01", "requests_count": 120, "total_cost": 0.45, ... },
    ...
  ]
}
```

---

## 🔄 Data Migration

### Migrate from SQLite to Supabase

```bash
# Dry run (no data written)
npx tsx scripts/migrate-sqlite-to-supabase.ts --dry-run

# Actual migration
npx tsx scripts/migrate-sqlite-to-supabase.ts

# Output:
# 🚀 Starting migration...
# 📦 Migrating bots... ✅ 5 migrated
# 💬 Migrating conversations... ✅ 120 migrated
# 📊 Migrating analytics... ✅ 30 migrated
# ✅ Migration complete!
```

**What gets migrated:**
- All bots
- Last 1000 conversations (configurable)
- All analytics records

**Note:** You'll need to map `owner_id` to Supabase user IDs manually if needed.

---

## 🛡️ Row Level Security (RLS)

### What is RLS?

Row Level Security automatically filters queries based on the authenticated user.

**Example:**
```sql
-- User A queries: SELECT * FROM bots;
-- Supabase automatically adds: WHERE owner_id = 'user_a_id'
-- User A only sees their own bots ✅
```

### Policies Created:

**Bots table:**
- Users can VIEW only their bots
- Users can INSERT bots (owner_id must match)
- Users can UPDATE only their bots
- Users can DELETE only their bots

**Admins:**
- Can view ALL bots
- Requires `user_roles` table entry

---

## 💰 ROI Calculation

### Cost Comparison

**Before Supabase (self-managed):**
```
PostgreSQL managed: $50/month (Cloud SQL)
Auth service: $25/month (custom implementation)
Storage: $20/month (Google Cloud Storage)
Realtime: $30/month (custom WebSocket server)
Monitoring: $15/month
Total: $140/month = $1,680/year
```

**After Supabase:**
```
Free tier: $0/month for <500 MB + 2 GB bandwidth
Paid tier: $25/month for unlimited (if needed)
Total: $0-300/year

SAVINGS: $1,380-1,680/year 💰
```

### Developer Time Saved

**Before:** 2 weeks to build auth + storage + realtime  
**After:** 1 day to integrate Supabase

**Time saved:** 9 days  
**Cost saved:** 9 days × $500/day = $4,500

**Total value:** $4,500 (one-time) + $1,680/year (recurring) = **$6,180 first year** 🎉

---

## 🔍 Troubleshooting

### "Supabase not initialized"

**Check 1: Environment variables**
```bash
grep SUPABASE .env

# Should show:
# SUPABASE_ENABLED=true
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=eyJxxx...
```

**Check 2: Restart**
```bash
npm run build && npm start
```

**Check 3: View logs**
```bash
npm start | grep -i supabase
# Should see: [Supabase] Initialized successfully ✅
```

---

### "Row not found" errors

**RLS is blocking access!**

**Fix:** Check RLS policies or use service role key for admin operations.

```bash
# Add to .env for admin operations
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # From Supabase dashboard
```

---

### Migration fails

**Common issues:**

1. **User IDs don't exist:**
   - Create users first: `supabase.signUp(...)`
   - Or use placeholder: `owner_id = 'PLACEHOLDER'`
   - Update later with correct IDs

2. **Duplicate keys:**
   - Bot names must be unique
   - Check existing data first

3. **Permission denied:**
   - RLS is blocking inserts
   - Use service role key
   - Or disable RLS temporarily (not recommended in prod)

---

## 🎯 Next Steps

### Week 1: Setup & Test
1. ✅ Create Supabase project
2. ✅ Deploy schema
3. ✅ Configure OpenCell
4. ✅ Test connection
5. ✅ Create test bot via API

### Week 2: Migration (Optional)
1. Backup SQLite data
2. Run migration script (dry-run first)
3. Verify data in Supabase
4. Switch OpenCell to use Supabase

### Week 3: Enable Features
1. Add OAuth providers (Google, GitHub)
2. Implement realtime subscriptions
3. Use storage for avatars
4. Create admin panel

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Auth Guide](https://supabase.com/docs/guides/auth)

---

## 🎉 Success Stories

### Before Supabase:
```
Database: Self-managed PostgreSQL
Auth: Custom JWT implementation (500 lines)
Storage: Manual S3 integration (300 lines)
Realtime: Custom WebSocket server (1000 lines)
Total code: 1,800 lines to maintain
Monthly cost: $140
```

### After Supabase:
```
Database: Managed PostgreSQL ✅
Auth: OAuth + JWT out-of-the-box ✅
Storage: S3-compatible API ✅
Realtime: WebSocket subscriptions ✅
Total code: 200 lines (just integration)
Monthly cost: $0-25

Code reduction: 89% 📉
Cost reduction: 82% 💰
Time saved: 9 days of development ⚡
```

---

**Next:** [Pinecone Integration](pinecone-guide.md) - Vector Database for Smart Memory

**Questions?** Check [FAQ](../FAQ.md) or open an issue.
