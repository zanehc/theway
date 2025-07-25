# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "교회 카페 주문 시스템" (Church Cafe Order System) - a web-based ordering and management system for a church cafe. The application is built with Remix.js as the frontend framework and Supabase (PostgreSQL) as the backend database, styled with Tailwind CSS.

## Tech Stack

- **Frontend**: Remix.js with TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS 
- **Build Tool**: Vite
- **Authentication**: Supabase Auth (supports Kakao login)
- **Deployment**: Vercel

## Common Development Commands

### Development
```bash
npm run dev          # Start development server on localhost:5173
npm run build        # Build for production
npm run start        # Start production server
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
npm run create-admin # Create admin user (uses scripts/create-admin.js)
```

## Architecture Overview

### Database Schema
The application uses 4 main tables in Supabase:

1. **users** - User accounts with roles (customer, staff, admin)
2. **menus** - Beverage menu items with categories and pricing
3. **orders** - Order records with status tracking
4. **order_items** - Individual items within each order (junction table)

Key relationships:
- Orders have many order_items
- Order_items reference both orders and menus
- Users can place orders but orders can also be anonymous

### Core Application Structure

```
app/
├── lib/
│   ├── supabase.ts     # Supabase client configuration
│   ├── database.ts     # Database query functions
│   └── auth.ts         # Authentication utilities
├── types/
│   └── index.ts        # TypeScript type definitions
├── components/         # Reusable React components
├── routes/            # Remix file-based routing
│   ├── _index.tsx     # Dashboard (home page)
│   ├── orders._index.tsx  # Order status board
│   ├── orders.new.tsx     # New order creation
│   ├── menus._index.tsx   # Menu management
│   └── reports._index.tsx # Sales reports
└── root.tsx           # Root layout with Tailwind setup
```

### Key Business Logic

1. **Order Flow**: pending → preparing → ready → completed/cancelled
2. **Payment Flow**: pending → confirmed (manual confirmation by staff)
3. **User Roles**: 
   - customer: Can place orders
   - staff: Can manage orders and view reports
   - admin: Full system access including menu management

### Database Query Patterns

The `app/lib/database.ts` file contains centralized database functions:
- All Supabase queries are abstracted into functions
- Uses TypeScript types from `app/types/index.ts`
- Includes error handling and logging
- Orders are fetched with joined order_items and menu data

### Environment Variables

Required environment variables (see `env.example`):
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Deployment Notes

- Configured for Vercel deployment via `vercel.json`
- Uses Remix's Vite plugin for building
- Environment variables need to be set in deployment platform
- Database migrations are handled via Supabase dashboard

## Important Files to Understand

- `app/lib/database.ts` - All database operations
- `app/types/index.ts` - TypeScript type definitions
- `app/lib/supabase.ts` - Database client setup
- `package.json` - Available scripts and dependencies
- `init_menus.sql` / `init_menus_with_images.sql` - Database seeding scripts

## Development Guidelines

- Follow existing TypeScript patterns in the codebase
- Use the database functions in `app/lib/database.ts` rather than direct Supabase calls
- Maintain the existing order status flow and payment confirmation pattern
- New routes should follow Remix conventions in the `app/routes/` directory
- Use Tailwind classes consistently with the existing red wine/ivory color scheme