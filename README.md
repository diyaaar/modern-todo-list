# AI-Powered Todo List Application

A modern, gamified todo list web application with AI-powered task suggestions, unlimited subtask nesting, and Supabase backend integration.

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (Dark Mode)
- **State Management**: React Context API
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI GPT-4 API
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- OpenAI API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

**⚠️ IMPORTANT: Supabase Key Security**

- **DO NOT** use the `sb_secret_...` key (Service Role Key) in your `.env` file
- **USE** the `anon` or `public` key from your Supabase dashboard
- Secret keys should NEVER be exposed in frontend code

**How to get your Anon Key:**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **`anon` `public`** key (NOT the `service_role` `secret` key)
5. The anon key typically starts with `eyJ...` (JWT format)

**Example:**
```env
# ✅ CORRECT - Anon/Public key (safe for frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ WRONG - Secret key (NEVER use in frontend!)
VITE_SUPABASE_ANON_KEY=sb_secret_Mxp4uwWU8taNo_kEyBZJRQ_V_cwXXSv
```

### 3. Supabase Database Setup

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  streak_count INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1
);

-- Tasks table (recursive for subtasks)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  deadline TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Task tags junction table
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- AI suggestions log
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Enable Row Level Security (RLS)

In Supabase, enable RLS on all tables and create policies to allow users to only access their own data.

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
  components/     # Reusable UI components
  contexts/       # React Context providers
  hooks/          # Custom React hooks
  lib/            # Third-party library configurations
  pages/          # Page components
  types/          # TypeScript type definitions
  utils/          # Utility functions
```

## Features (Phase 1 - Completed)

- ✅ React + TypeScript + Vite setup
- ✅ Tailwind CSS with dark mode
- ✅ Supabase client configuration
- ✅ Authentication (Sign up, Sign in, Sign out)
- ✅ Protected routes
- ✅ Base layout components

## Features (Phase 2 - Completed)

- ✅ Task management with nested subtasks (unlimited nesting)
- ✅ CRUD operations for tasks (Create, Read, Update, Delete)
- ✅ Recursive subtask rendering
- ✅ Drag-and-drop reordering (root level tasks)
- ✅ Priority management (High, Medium, Low) with color-coded badges
- ✅ Deadline management with date picker and overdue indicators
- ✅ Completion percentage calculation based on subtasks
- ✅ Task filtering (All, Active, Completed)
- ✅ Task sorting (Created Date, Deadline, Priority, Title)
- ✅ Search functionality
- ✅ Progress bars for tasks with subtasks
- ✅ Smooth animations with Framer Motion

## Features (Phase 3 - Completed)

- ✅ OpenAI API integration for AI-powered features
- ✅ AI subtask suggestions - Generate 5-7 practical subtasks for any task
- ✅ AI suggestions modal with checkbox selection interface
- ✅ Batch add selected AI suggestions as subtasks
- ✅ Natural language task creation - Parse natural language input into structured tasks
- ✅ Automatic extraction of priority and deadline from natural language
- ✅ AI suggestions logging to database
- ✅ Loading states and error handling for all AI features
- ✅ Smooth animations for AI interactions

## Features (Phase 4 - Completed)

- ✅ Tag system with full CRUD operations
- ✅ Tag creation with color selection (10 predefined colors)
- ✅ Tag assignment to tasks via TagSelector component
- ✅ Tag display on tasks with TagBadge component
- ✅ Tag filtering - Filter tasks by one or multiple tags
- ✅ Date range filtering - Filter tasks by deadline date range
- ✅ Enhanced TaskFilters component with tag and date range controls
- ✅ Real-time tag updates with Supabase subscriptions

## Features (Phase 6 - Completed)

- ✅ Toast notification system with success, error, info, and warning types
- ✅ Skeleton loaders for loading states (TaskSkeleton, TaskListSkeleton)
- ✅ Enhanced micro-interactions:
  - Hover effects with scale transforms
  - Active state animations (scale down on click)
  - Smooth transitions on all interactive elements
  - Focus ring indicators for keyboard navigation
- ✅ Responsive design (mobile-first):
  - Mobile-optimized layouts and spacing
  - Responsive typography and button sizes
  - Collapsible user info on mobile
  - Touch-friendly button sizes and spacing
- ✅ Accessibility features:
  - ARIA labels on all interactive elements
  - Keyboard navigation support with focus indicators
  - Semantic HTML structure
  - Screen reader friendly labels
  - Proper role attributes (checkbox, main, etc.)
- ✅ Enhanced animations:
  - Smooth page transitions
  - Staggered list animations
  - Spring animations for checkboxes
  - Hover and active state animations
  - Toast notification animations

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT

