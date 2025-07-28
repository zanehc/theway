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

## Architecture Overview

### Tech Stack
- **Framework**: Remix with Vite and SSR
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS with custom theme (Red Wine + Ivory color scheme)
- **Authentication**: Supabase Auth with Google OAuth
- **Notifications**: Custom notification system with database storage

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
- `/admin.news` - Church news management

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
- User session persists across page refreshes via SSR cookies
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
- `AdminLoginForm` - Admin authentication
- `Header` - Page headers with role-appropriate actions

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- Tailwind CSS for styling with custom color scheme
- Korean language UI with English code/comments
- Responsive mobile-first design

### Environment Setup
Required environment variables (see env.example):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side API key
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` - Web push notifications

### Important Development Notes

**SSR Authentication Requirements:**
- Development must run on same port/domain for cookie sharing
- Cookies: `sb-access-token`, `sb-refresh-token`, `sb-session` required
- SameSite=Lax, Path=/ for development environment
- Secure flag disabled in development

**Database Access Patterns:**
- All queries go through `app/lib/database.ts` functions
- Row Level Security policies enforce access control
- Admin users can access all data, customers see only their own orders
- Use `getUserById`, `getOrders`, `createOrder` etc. for data operations

### Testing Data
Use scripts in the `scripts/` directory to:
- Create admin accounts for testing
- Generate test orders
- Verify user roles and permissions
- Clean up test data

### Common Tasks
- **Add new menu items**: Use admin interface at `/menus`
- **Create admin user**: Run `npm run create-admin`
- **Monitor orders**: Check `/orders` status board
- **View analytics**: Access `/reports` for sales data
- **Manage notifications**: System automatically handles order status notifications