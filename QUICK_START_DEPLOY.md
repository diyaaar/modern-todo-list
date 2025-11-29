# 🚀 Quick Start: Deploy to Vercel (5 Minutes)

## Prerequisites Check ✅

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] Your `.env` file with all three variables set
- [ ] App builds successfully (`npm run build`)

---

## Step-by-Step Commands

### 1️⃣ Initialize Git & Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Modern ToDo List"

# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy to Vercel

1. Go to **https://vercel.com**
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **IMPORTANT**: Add environment variables BEFORE deploying:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
5. Click **"Deploy"**

### 3️⃣ Verify Deployment

- Wait 1-2 minutes for build to complete
- Click the deployment URL
- Test sign up / sign in
- Create a test task

---

## ⚠️ Common Issues

**Build fails?**
- Check Vercel build logs
- Ensure all dependencies are in `package.json`

**Environment variables not working?**
- Verify variable names start with `VITE_`
- Redeploy after adding variables

**Supabase connection errors?**
- Double-check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Ensure Supabase project is active

---

## 📖 Full Guide

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

