# Google Calendar API Setup Guide

This guide will help you set up Google Calendar API integration for the Todo List app.

## Prerequisites

1. A Google Cloud Project
2. Google Calendar API enabled
3. OAuth 2.0 credentials configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Calendar API

1. In Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: "Modern Todo List"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Add test users (your email) if in testing mode
   - Save and continue through the steps

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Todo List Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/calendar/auth/callback` (for local development)
     - `https://yourdomain.com/api/calendar/auth/callback` (for production)
   - Click **Create**

5. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add these environment variables to your Vercel project (or `.env.local` for local development):

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/auth/callback
FRONTEND_URL=https://yourdomain.com

# Supabase (for serverless functions - REQUIRED)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ IMPORTANT:** 
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **REQUIRED** for the calendar API routes
- These are different from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (which are for client-side)
- The service role key should start with `eyJ...` (JWT format) or be your service role secret key
- Never expose the service role key in client-side code

For local development:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/auth/callback
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 5: Database Setup (Optional - for token storage)

If you want to store Google Calendar tokens securely in Supabase:

1. Create a new table in Supabase:

```sql
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own tokens
CREATE POLICY "Users can manage their own tokens"
  ON google_calendar_tokens
  FOR ALL
  USING (auth.uid() = user_id);
```

2. Update the API endpoints to use this table for token storage/retrieval.

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   # In another terminal:
   npx vercel dev
   ```

2. Navigate to the Calendar tab in your app
3. Click "Connect Google Calendar"
4. Complete the OAuth flow
5. You should see your Google Calendar events in the calendar view

## Troubleshooting

### "redirect_uri_mismatch" Error

- Make sure the redirect URI in your OAuth credentials exactly matches the one in your environment variables
- Check that you've added both HTTP (localhost) and HTTPS (production) URIs

### "access_denied" Error

- Make sure you've added your email as a test user in the OAuth consent screen (if in testing mode)
- Check that the required scopes are added to the consent screen

### Events Not Showing

- Verify that Google Calendar API is enabled
- Check that tokens are being stored correctly
- Review server logs for API errors

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for all sensitive data
- Store tokens securely (encrypted in database)
- Implement token refresh logic
- Use HTTPS in production

## Production Checklist

- [ ] OAuth consent screen published (if needed)
- [ ] Production redirect URIs added to OAuth credentials
- [ ] Environment variables set in Vercel
- [ ] Database table created (if using Supabase for token storage)
- [ ] Token refresh logic tested
- [ ] Error handling implemented
- [ ] Rate limiting considered

