# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development Workflow
- `npm run dev` - Start development server on http://localhost:5173
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint checks

### Database & Admin Tools
- `npm run create-admin` - Create admin user account (script at scripts/create-admin.js)
- Check scripts/ directory for additional database utilities:
  - `check-user-role.mjs` - Verify user roles
  - `create-test-order.mjs` - Generate test orders
  - `delete-orders.mjs` - Clean up test data

### Mobile App (Capacitor)
- `npm run cap:sync` - Sync web build to native projects
- `npm run cap:open:android` - Open Android Studio
- `npm run cap:open:ios` - Open Xcode

## Architecture Overview

### Tech Stack
- **Framework**: Remix with Vite and SSR
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS with custom theme (Red Wine + Ivory color scheme)
- **Authentication**: Supabase Auth with Google/Kakao OAuth (PKCE flow)
- **Notifications**: Custom notification system with database storage
- **Mobile**: Capacitor for Android/iOS apps

### Deployment
- **Production URL**: https://theway2.vercel.app
- **Supabase Region**: ap-south-1 (Mumbai) - note potential latency for Korean users
- **Hosting**: Vercel with automatic deployments from main branch

### Core Application Structure

This is a Korean church cafe ordering and management system (길을여는교회 이음카페). The application follows a clean separation between customer-facing features and admin management.

**Key Domains:**
- **Orders**: Complete order lifecycle from creation to completion/pickup
- **Menus**: Product catalog with categories and pricing
- **Users**: Customer, staff, and admin role management with church group assignments
- **Notifications**: Real-time order status updates
- **Reports**: Sales analytics and business intelligence

### Routing Patterns
- `/` - Dashboard with order statistics and quick actions
- `/orders/new` - Customer order placement interface
- `/orders` - Order status board (filtered views by status)
- `/menus` - Menu management (admin)
- `/reports` - Sales reports and analytics
- `/auth/*` - Authentication flows including profile setup
- `/auth/callback` - OAuth callback handler (code exchange)
- `/admin.news` - Church news management
- `/recent` - Recent orders for logged-in users

### Database Schema

**Core Tables:**
- `users` - User profiles with roles (customer/staff/admin) and church groups
- `menus` - Product catalog with categories, pricing, and availability
- `orders` - Order records with customer info, payment status, and order status
- `order_items` - Line items linking orders to menus with quantities
- `notifications` - User notifications for order updates

**Key Relationships:**
- Orders have many order_items, each referencing a menu
- Users can have many orders
- Notifications are tied to users and orders

### State Management Patterns

**Authentication State:**
- Global auth state managed in root.tsx with Supabase listener
- Supabase client uses PKCE flow with localStorage persistence
- Storage key: `theway-cafe-auth-token`
- Role-based access control enforced at route level

**Data Fetching:**
- Remix loaders for SSR data fetching
- Supabase client for real-time subscriptions
- Database utilities in `app/lib/database.ts` handle all queries

**Order Status Flow:**
`pending` → `preparing` → `ready` → `completed` (or `cancelled`)
Payment status: `pending` → `confirmed`

### Component Architecture

**Layout System:**
- `root.tsx` - Global layout with auth provider and bottom navigation
- `BottomNavigation` - Main navigation for mobile-first design
- `GlobalToast` - System-wide notification display

**Key Components:**
- `NotificationProvider` - Context for notification state
- `MyPageModal` - User profile management
- `LoginForm` - OAuth login (Google/Kakao)
- `Header` - Page headers with role-appropriate actions

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- Tailwind CSS for styling with custom color scheme
- Korean language UI with English code/comments
- Responsive mobile-first design

### Environment Setup
Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key (check for typos - project ref must match URL)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side API key
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` - Web push notifications (optional)

### Important Development Notes

**Supabase Client Initialization:**
- Client uses Proxy pattern for lazy initialization (`app/lib/supabase.ts`)
- Environment variables loaded from `window.__ENV` on client, `process.env` on server
- PKCE flow enabled with `detectSessionInUrl: true`

**OAuth Callback Flow:**
1. User clicks login → Supabase redirects to Google/Kakao
2. Provider redirects to Supabase callback URL
3. Supabase redirects to `/auth/callback` with code
4. `auth.callback.tsx` exchanges code for session via `exchangeCodeForSession()`
5. Profile lookup in users table (with 15s timeout for region latency)
6. New users redirected to `/auth/profile-setup`

**Common OAuth Issues:**
- "Invalid API key" → Check SUPABASE_ANON_KEY matches project URL ref
- 400 errors → Clear browser cache and try fresh login
- Timeout errors → Supabase region (ap-south-1) may cause latency

**Database Access Patterns:**
- All queries go through `app/lib/database.ts` functions
- Row Level Security policies enforce access control
- Admin users can access all data, customers see only their own orders

### Testing Data
Use scripts in the `scripts/` directory to:
- Create admin accounts for testing
- Generate test orders
- Verify user roles and permissions
- Clean up test data
