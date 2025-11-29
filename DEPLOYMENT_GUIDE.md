# 🚀 Deployment Guide: Modern ToDo List to Vercel

Complete step-by-step guide to deploy your React + Vite + Supabase app to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Step 1: Prepare Your Code](#step-1-prepare-your-code)
3. [Step 2: Set Up GitHub Repository](#step-2-set-up-github-repository)
4. [Step 3: Deploy to Vercel](#step-3-deploy-to-vercel)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Test Your Deployment](#step-5-test-your-deployment)
7. [Step 6: Update Your App After Deployment](#step-6-update-your-app-after-deployment)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are in `.env` (not committed to Git)
- [ ] `.gitignore` excludes `.env` files
- [ ] App builds successfully locally (`npm run build`)
- [ ] No hardcoded API keys or secrets in code
- [ ] Supabase project is set up and configured
- [ ] Database migrations are complete

---

## 📦 Step 1: Prepare Your Code

### 1.1 Verify .gitignore

Your `.gitignore` should already exclude sensitive files. Verify it includes:

```
.env
.env.local
.env.production
node_modules/
dist/
```

✅ **Your `.gitignore` is already configured correctly!**

### 1.2 Create .env.example (Optional but Recommended)

Create a template file for reference (this CAN be committed):

```bash
# Copy your .env and remove actual values
cp .env .env.example
```

Then edit `.env.example` to show the structure:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 1.3 Test Build Locally

```bash
# Clean previous builds
rm -rf dist

# Build for production
npm run build

# Test the production build locally
npm run preview
```

✅ If the build succeeds and preview works, you're ready to deploy!

---

## 🐙 Step 2: Set Up GitHub Repository

### 2.1 Initialize Git (if not already done)

```bash
# Check if git is initialized
git status

# If not initialized, run:
git init
```

### 2.2 Create .gitignore (if needed)

Your `.gitignore` is already set up correctly. Just verify it exists.

### 2.3 Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `modern-todo-list` (or your preferred name)
3. **Visibility**: 
   - Choose **Private** (recommended for projects with API keys)
   - Or **Public** if you want it open-source
4. **DO NOT** initialize with README, .gitignore, or license (you already have these)
5. Click **"Create repository"**

### 2.4 Push Your Code to GitHub

```bash
# Add all files (except those in .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Modern ToDo List app"

# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Important Security Check:**
```bash
# Verify no .env files are in the repository
git ls-files | grep .env

# Should return nothing! If it shows .env files, remove them:
# git rm --cached .env
# git commit -m "Remove .env from repository"
```

---

## 🚀 Step 3: Deploy to Vercel

### 3.1 Sign Up / Log In to Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended for easy integration)

### 3.2 Import Your GitHub Repository

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Find your repository (`modern-todo-list` or your repo name)
4. Click **"Import"**

### 3.3 Configure Project Settings

Vercel will auto-detect your framework. Verify:

- **Framework Preset**: `Vite` (should auto-detect)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `dist` (default)
- **Install Command**: `npm install` (default)

✅ These should be correct by default. Click **"Deploy"** to continue.

---

## 🔐 Step 4: Configure Environment Variables

### 4.1 Add Environment Variables in Vercel

**Before the first deployment completes**, add your environment variables:

1. In the project setup page, find **"Environment Variables"** section
2. Click **"Add"** for each variable:

   **Variable 1:**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL (from Supabase Dashboard → Settings → API)
   - **Environment**: Select all (Production, Preview, Development)

   **Variable 2:**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon/public key (from Supabase Dashboard → Settings → API)
   - **Environment**: Select all (Production, Preview, Development)

   **Variable 3:**
   - **Name**: `VITE_OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (from OpenAI Dashboard)
   - **Environment**: Select all (Production, Preview, Development)

3. Click **"Save"** after adding each variable

### 4.2 Redeploy After Adding Variables

After adding environment variables:

1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the **"..."** menu → **"Redeploy"**
4. This ensures the new environment variables are included

---

## ✅ Step 5: Test Your Deployment

### 5.1 Verify Deployment

1. After deployment completes, Vercel provides a URL like:
   - `https://your-app-name.vercel.app`
2. Click the URL to open your app
3. Test the following:

   ✅ **Authentication**
   - Sign up with a new account
   - Sign in with existing account
   - Sign out

   ✅ **Core Features**
   - Create a new task
   - Edit a task
   - Delete a task
   - Mark task as complete
   - Create subtasks

   ✅ **Advanced Features**
   - Create workspaces
   - Switch between workspaces
   - Add tags to tasks
   - Upload background images
   - Add links and attachments
   - Use AI suggestions

### 5.2 Check Browser Console

1. Open browser DevTools (F12)
2. Check **Console** tab for errors
3. Check **Network** tab for failed requests

### 5.3 Verify Environment Variables

If you see errors about missing API keys:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Verify all three variables are set
3. **Redeploy** the project

---

## 🔄 Step 6: Update Your App After Deployment

### 6.1 Make Changes Locally

```bash
# Make your code changes
# ... edit files ...

# Test locally
npm run dev
```

### 6.2 Commit and Push to GitHub

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add new feature: [describe your changes]"

# Push to GitHub
git push origin main
```

### 6.3 Vercel Auto-Deploys

✅ **Vercel automatically detects the push and redeploys!**

1. Go to Vercel Dashboard
2. You'll see a new deployment in progress
3. Wait for it to complete (usually 1-2 minutes)
4. Your changes are live!

### 6.4 Manual Redeploy (if needed)

If auto-deploy doesn't trigger:

1. Vercel Dashboard → **Deployments**
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

---

## 🛠️ Troubleshooting

### Issue: Build Fails on Vercel

**Error**: `Cannot find module` or build errors

**Solution**:
1. Check Vercel build logs for specific errors
2. Ensure `package.json` has all dependencies
3. Try clearing Vercel cache: Settings → General → Clear Build Cache

### Issue: Environment Variables Not Working

**Error**: API calls fail or "undefined" errors

**Solution**:
1. Verify variables are named correctly (must start with `VITE_`)
2. Check variable values in Vercel Dashboard
3. **Redeploy** after adding/changing variables
4. Environment variables are only available at build time for Vite

### Issue: Supabase Connection Errors

**Error**: "Failed to connect to Supabase"

**Solution**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
2. Check Supabase Dashboard → Settings → API
3. Ensure Supabase project is active
4. Check if RLS policies allow public access where needed

### Issue: OpenAI API Errors

**Error**: "Invalid API key" or rate limit errors

**Solution**:
1. Verify `VITE_OPENAI_API_KEY` is correct
2. Check OpenAI Dashboard for API key status
3. Verify you have credits/quota available
4. Check rate limits in OpenAI Dashboard

### Issue: Images/Assets Not Loading

**Error**: 404 errors for images or assets

**Solution**:
1. Ensure image paths are relative (not absolute)
2. Check Supabase Storage bucket permissions
3. Verify RLS policies for storage buckets
4. Check browser console for specific 404 errors

### Issue: CORS Errors

**Error**: "CORS policy" errors in console

**Solution**:
1. Check Supabase Dashboard → Settings → API → CORS
2. Add your Vercel domain to allowed origins
3. Or use Supabase's default CORS settings

---

## 📝 Additional Configuration (Optional)

### Custom Domain

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel handles SSL certificates automatically

### Environment-Specific Variables

You can set different values for Production, Preview, and Development:

1. Vercel Dashboard → Settings → **Environment Variables**
2. When adding a variable, select specific environments
3. Example: Use a test Supabase project for Preview builds

### Build Optimization

Vercel automatically optimizes your build, but you can:

1. Enable **"Automatic HTTPS"** (enabled by default)
2. Configure **"Edge Functions"** if needed
3. Set up **"Analytics"** for performance monitoring

---

## 🎉 Success Checklist

After deployment, you should have:

- ✅ App accessible at `https://your-app.vercel.app`
- ✅ All features working (auth, tasks, workspaces, etc.)
- ✅ Environment variables configured
- ✅ GitHub repository connected
- ✅ Auto-deployment enabled
- ✅ No console errors
- ✅ Fast load times

---

## 📚 Useful Links

- **Vercel Documentation**: https://vercel.com/docs
- **Vite Deployment Guide**: https://vitejs.dev/guide/static-deploy.html
- **Supabase Documentation**: https://supabase.com/docs
- **GitHub Actions** (if needed): https://docs.github.com/en/actions

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use environment variables for all secrets
3. ✅ Keep Supabase RLS policies enabled
4. ✅ Regularly rotate API keys
5. ✅ Use private GitHub repositories for sensitive projects
6. ✅ Enable Vercel password protection for preview deployments (optional)

---

**Congratulations! Your app is now live in production! 🎊**

For questions or issues, check the troubleshooting section or Vercel's support documentation.

