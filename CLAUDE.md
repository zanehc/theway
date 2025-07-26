# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "길을여는교회 이음카페" (The Way Church Connection Cafe) - a church cafe ordering and management system built with Remix, Supabase, and Tailwind CSS. The application provides a complete ordering system for a church cafe with real-time order management, menu administration, and sales reporting.

## Development Commands

### Common Commands
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with caching
- `npm run typecheck` - Run TypeScript type checking
- `npm run create-admin` - Create admin user (requires environment setup)

### Essential Commands to Run After Changes
Always run these commands after making code changes:
- `npm run lint` - Check code style and catch potential issues
- `npm run typecheck` - Ensure TypeScript type safety

## Technology Stack

### Frontend
- **Remix v2.16.8** - Full-stack React framework with SSR
- **TypeScript** - Type safety throughout the application  
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Vite** - Build tool and development server

### Backend & Database
- **Supabase** - PostgreSQL database with authentication and real-time features
  - Authentication with Google OAuth
  - Row Level Security (RLS) policies
  - Real-time subscriptions for order updates
- **@supabase/ssr** - Server-side rendering support for Supabase auth

### Design System
- **Primary Color**: Red Wine (warm, premium feel)
- **Secondary Color**: Ivory (clean, soft feel)  
- Modern gradient designs with smooth animations

## Architecture Overview

### Database Schema
Core tables and relationships:
- `users` - User management with roles (customer, staff, admin) and church groups
- `menus` - Menu items with categories, pricing, and availability
- `orders` - Order management with status tracking and payment confirmation
- `order_items` - Line items linking orders to menus with quantities
- `notifications` - Real-time notification system
- `church_news` - Church announcements and news

### Key Relationships
- Orders → Users (customer information)
- Order Items → Orders → Menus (detailed order composition)
- Notifications → Users + Orders (order status updates)

### Application Structure

#### Route Structure
- `/` - Dashboard with system statistics and quick actions
- `/orders/new` - New order creation interface
- `/orders` - Order status management board (implicit _index)
- `/menus` - Menu management interface (implicit _index) 
- `/reports` - Sales reporting and analytics (implicit _index)
- `/admin/news` - Admin-only church news management
- `/mypage` - User profile and order history
- Authentication routes: `/login`, `/auth/*`

#### Core Components
- `Layout.tsx` - Main application layout wrapper
- `BottomNavigation.tsx` - Mobile-first navigation
- `Header.tsx` - Top navigation with user context
- `GlobalToast.tsx` - System-wide notification toasts
- `NotificationContext.tsx` - Real-time notification management

#### Data Layer
- `app/lib/supabase.ts` - Supabase client configuration
- `app/lib/database.ts` - Database query functions and business logic
- `app/types/index.ts` - TypeScript type definitions

### Authentication & Authorization
- Google OAuth integration through Supabase Auth
- Server-side session management with cookies
- Role-based access control (customer/staff/admin)
- Row Level Security policies enforce data access rules

### Real-time Features
- Order status updates via Supabase real-time subscriptions
- Live notification system for order changes
- Automatic UI updates when order statuses change

## Development Environment Setup

### SSR Authentication Requirements
The application uses server-side rendering with cookie-based authentication. For proper authentication in development:

- Frontend and backend must run on the same port/domain (both on http://localhost:5173)
- Cookies must be properly configured: SameSite=Lax, Path=/
- Check browser dev tools: Application → Cookies → localhost should show sb-access-token, sb-refresh-token, sb-session
- Network requests should include cookie headers

### Environment Variables
Required in `.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=development
```

### Database Setup
- Run SQL migration files in order for fresh setup
- Use `init_menus_with_images.sql` for sample menu data
- Key migration files handle RLS policies and table structure

## Key Business Logic

### Order Workflow
1. **Order Creation** - Customer selects items, enters details, chooses payment method
2. **Order Processing** - Status progression: pending → preparing → ready → completed
3. **Payment Confirmation** - Separate payment status tracking (pending/confirmed)
4. **Notification System** - Real-time updates to customers and staff

### Menu Management
- Category-based organization (beverages, food, etc.)
- Price management with availability toggles
- Image support for menu items

### Sales Analytics
- Real-time dashboard statistics
- Daily, weekly, monthly revenue tracking  
- Popular menu analysis
- Church group (목장) statistics

### User Management
- Role-based permissions
- Church group assignment for customers
- Admin tools for user management

## Development Guidelines

### Code Patterns
- Use TypeScript types from `app/types/index.ts`
- Follow existing component patterns in `app/components/`
- Database queries go in `app/lib/database.ts`
- Use Tailwind utility classes following the existing design system

### State Management
- Server state via Remix loaders/actions
- Client state via React hooks and context
- Real-time updates via Supabase subscriptions

### Error Handling
- Database errors logged to console with descriptive messages
- User-facing error messages via toast notifications
- Graceful fallbacks for failed data fetching

## Scripts and Utilities

### Management Scripts (in /scripts/)
- `create-admin.js` - Create admin users
- `check-user-role.mjs` - Verify user roles
- `create-test-order.mjs` - Generate test data
- `delete-orders.mjs` - Cleanup utilities

### Database Migrations
Multiple SQL files handle schema updates and data initialization. Key files:
- `supabase_migrations.sql` - Main schema and RLS policies
- `init_menus_with_images.sql` - Sample menu data
- `create_notifications_table.sql` - Notification system setup