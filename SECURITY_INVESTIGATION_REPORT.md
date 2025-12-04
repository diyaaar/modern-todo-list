# 🔒 SECURITY INVESTIGATION REPORT: OpenAI API Key Exposure

**Date:** December 1, 2025  
**Severity:** CRITICAL  
**Status:** CONFIRMED LEAK

---

## 🚨 EXECUTIVE SUMMARY

**Root Cause:** The OpenAI API key was exposed in client-side JavaScript bundle due to using `VITE_` prefix, which makes environment variables publicly accessible in the browser.

**Exposure Duration:** Approximately 2-3 days (November 29 - December 1, 2025)

**Exposure Vector:** Production build files deployed to hosting service (likely Vercel)

---

## 📋 DETAILED FINDINGS

### 1. PRIMARY LEAK: Client-Side JavaScript Bundle

**Location:** `dist/assets/index-BrEnu38u.js` (production build)

**Issue:** The API key is hardcoded in the built JavaScript file:
```javascript
const T1="sk-proj-***REDACTED***"
```

**How it happened:**
- Source code uses: `import.meta.env.VITE_OPENAI_API_KEY`
- Vite replaces `VITE_` prefixed variables with actual values during build
- The API key gets hardcoded into the JavaScript bundle
- Built files are publicly accessible when deployed

**Files Involved:**
- `src/lib/openai.ts` (line 4): `const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY`
- `src/vite-env.d.ts` (line 6): Type definition for `VITE_OPENAI_API_KEY`

**Commits:**
- Initial commit: `2e3c45980ff31208ef369a05f7787dd6f03c8ea7` (Nov 29, 2025)
- Photo Recognition feature: `a72882274ed0232f4a90e7265dd23f8503815973` (Nov 29, 2025)

**Exposure Timeline:**
- **First Exposure:** November 29, 2025 (Initial commit)
- **Last Check:** December 1, 2025
- **Duration:** ~2-3 days

---

### 2. WHY THIS IS CRITICAL

**Vite Environment Variable Behavior:**
- Variables prefixed with `VITE_` are **exposed to client-side code**
- They are **bundled into the JavaScript** during build
- They are **publicly accessible** in the browser
- Anyone can view source code and see the key

**This is NOT secure for API keys!**

---

### 3. WHAT WAS NOT FOUND (Good News)

✅ **No .env files committed to git**
- `.env` and `.env.local` are properly in `.gitignore`
- No `.env` files found in git history

✅ **No hardcoded keys in source code**
- Source files only reference `import.meta.env.VITE_OPENAI_API_KEY`
- No actual key values in committed source code

✅ **dist/ folder not committed**
- `dist/` is in `.gitignore`
- Build files were not committed to GitHub

---

### 4. HOW THE KEY WAS EXPOSED

**Deployment Scenario:**
1. Code was built locally or on Vercel with `npm run build`
2. Build process read `.env` file containing `VITE_OPENAI_API_KEY=sk-...`
3. Vite replaced `import.meta.env.VITE_OPENAI_API_KEY` with actual key value
4. Built JavaScript files were deployed to Vercel/hosting
5. Anyone visiting the site could:
   - View page source
   - Open browser DevTools
   - Inspect JavaScript files
   - See the hardcoded API key

**Evidence:**
- Repository: `https://github.com/diyaaar/modern-todo-list.git`
- Deployment config: `vercel.json` exists (confirms Vercel deployment)
- Build output: `dist/assets/index-BrEnu38u.js` contains hardcoded key

---

## 🔧 IMMEDIATE ACTIONS REQUIRED

### 1. REVOKE THE EXPOSED KEY (URGENT - DO THIS NOW)

1. Go to OpenAI Dashboard: https://platform.openai.com/api-keys
2. Revoke the exposed key: `sk-proj-***REDACTED***`
3. Generate a new API key
4. Update your `.env` file with the new key

### 2. FIX THE ARCHITECTURE (CRITICAL)

**Problem:** API keys should NEVER be in client-side code.

**Solution:** Move OpenAI API calls to a backend server/API route.

**Option A: Create a Backend API (Recommended)**
- Create API routes (e.g., `/api/openai/...`)
- Keep API key on server-side only
- Client makes requests to your API, not directly to OpenAI

**Option B: Use Vercel Serverless Functions**
- Create API routes in `api/` folder
- Use serverless functions to proxy OpenAI requests
- API key stays server-side

**Option C: Use Supabase Edge Functions**
- Create Supabase Edge Functions
- Handle OpenAI calls server-side
- Client calls your Supabase function

### 3. CLEAN UP EXPOSED BUILDS

1. **Delete current deployment:**
   - Go to Vercel dashboard
   - Delete the current deployment
   - This removes the exposed JavaScript files

2. **Rebuild after fix:**
   - Fix the architecture first
   - Then rebuild and redeploy

3. **Verify no keys in new build:**
   ```bash
   npm run build
   grep -r "sk-" dist/  # Should return nothing
   ```

### 4. UPDATE ENVIRONMENT VARIABLES

**Remove from client-side:**
- Remove `VITE_OPENAI_API_KEY` from `.env`
- Remove from `src/vite-env.d.ts`

**Add to server-side only:**
- Use `OPENAI_API_KEY` (without VITE_ prefix) in server-side code
- Set in Vercel environment variables (not exposed to client)

---

## 📝 CODE CHANGES REQUIRED

### File: `src/lib/openai.ts`

**Current (INSECURE):**
```typescript
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
```

**Should be:** Remove this file or make it call your backend API instead.

### File: `src/vite-env.d.ts`

**Current:**
```typescript
readonly VITE_OPENAI_API_KEY: string
```

**Should be:** Remove this line (API key should not be in client-side types).

### New: Create Backend API Route

**Example: `api/openai/suggestions.ts` (Vercel Serverless Function)**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.OPENAI_API_KEY // Server-side only!
  
  // Handle OpenAI API calls here
  // Return results to client
}
```

---

## 🛡️ PREVENTION MEASURES

1. **Never use `VITE_` prefix for secrets:**
   - `VITE_` = exposed to client
   - Use plain names for server-side only

2. **Add pre-commit hook:**
   ```bash
   # .husky/pre-commit
   #!/bin/sh
   npm run build
   if grep -r "sk-" dist/; then
     echo "ERROR: API keys found in build!"
     exit 1
   fi
   ```

3. **Add build verification:**
   ```bash
   # package.json
   "scripts": {
     "build": "vite build && npm run verify-build",
     "verify-build": "grep -r 'sk-' dist/ && exit 1 || exit 0"
   }
   ```

4. **Review deployment logs:**
   - Check Vercel build logs for any key exposure
   - Monitor for unauthorized API usage

---

## 📊 EXPOSURE SUMMARY

| Item | Details |
|------|---------|
| **Key Exposed** | `sk-proj-***REDACTED***` |
| **Exposure Vector** | Client-side JavaScript bundle |
| **Location** | `dist/assets/index-BrEnu38u.js` (in deployed build) |
| **First Exposure** | November 29, 2025 |
| **Duration** | ~2-3 days |
| **Root Cause** | Using `VITE_` prefix exposes env vars to client |
| **GitHub Status** | ✅ Not committed to git (dist/ is ignored) |
| **Deployment Status** | ⚠️ Likely exposed on Vercel/hosting |

---

## ✅ VERIFICATION CHECKLIST

- [ ] API key revoked in OpenAI dashboard
- [ ] New API key generated
- [ ] Architecture changed to server-side API calls
- [ ] `VITE_OPENAI_API_KEY` removed from client code
- [ ] Backend API routes created
- [ ] Old deployment deleted
- [ ] New build verified (no keys in JavaScript)
- [ ] New deployment completed
- [ ] Monitoring set up for unauthorized usage

---

## 📞 NEXT STEPS

1. **IMMEDIATE:** Revoke the exposed key (already done by OpenAI)
2. **URGENT:** Fix architecture to use server-side API
3. **CRITICAL:** Delete current deployment
4. **IMPORTANT:** Rebuild and redeploy with secure architecture
5. **ONGOING:** Monitor OpenAI usage for unauthorized access

---

**Report Generated:** December 1, 2025  
**Investigation Status:** COMPLETE  
**Action Required:** IMMEDIATE

