# SpacECE-CRM: WhatsApp Communication & Tracking System

**Built for**: Spacece India Foundation  
**Tech Stack**: React 18, Vite, TypeScript, Pure Custom CSS, Lucide Icons, Supabase (PostgreSQL), Meta Cloud API v18.0, n8n Webhooks  
**Build Status**: 100% Completed & Verified (`npm run build` passed with 0 errors)  
**Live Application URL**: `https://spacececrm.vercel.app/`

---

## 🌟 Executive Overview
**SpacECE-CRM** is a web-based, enterprise WhatsApp Communication & Tracking System designed specifically for educational institutions and foundation management. It empowers staff to manage parent communications, track student admission inquiries through a 4-stage Kanban pipeline, dispatch audience-targeted bulk WhatsApp broadcasts, store educational media assets, analyze real-time metrics, monitor subscription quotas, and trigger external n8n automation workflows.

All CRM state and operational data are persisted securely using a cloud-hosted **Supabase PostgreSQL database** with real-time WebSocket subscriptions and Row-Level Security (RLS).

---

## 🛠️ Technology Stack

| Layer | Technology Used | Description / Purpose |
|---|---|---|
| **Frontend Framework** | **React 18** | UI component architecture & reactive state rendering |
| **Build System** | **Vite v8.2** | Lightning-fast HMR dev server & optimized production bundler |
| **Language** | **TypeScript** | Type-safe interfaces, models, and compile-time verification |
| **Styling & Theme** | **Vanilla Pure Custom CSS** | Custom CSS design system with HSL variables (Spacece Teal `#0d9488` & Navy `#0f172a`) |
| **Iconography** | **Lucide Icons (`lucide-react`)** | Modern UI iconography for all action buttons, status pills, and cards |
| **Database & Persistence** | **Supabase (PostgreSQL)** | Cloud-hosted relational database with 11 core tables, Row Level Security (RLS), and `@supabase/supabase-js` integration |
| **Realtime Sync** | **Supabase Realtime** | Instant WebSocket updates via `postgres_changes` subscriptions and custom `useSupabaseData` hook |
| **WhatsApp Integration** | **Meta Cloud API v18.0** | Direct integration with Graph API endpoint for live message delivery & verification |
| **Automation Engine** | **Reactive Event Hooks + Webhooks** | Internal automation dispatcher supporting n8n & external REST APIs with HMAC signatures |

---

## 📐 System Workflow & Architecture Schema

### System Data Flow Architecture
```text
                                 ┌───────────────────────────────────────────────────────────┐
                                 │              SPACECE INDIA FOUNDATION CRM                 │
                                 └───────────────────────────────────────────────────────────┘
                                                                │
                      ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                      ▼                                         ▼                                         ▼
        ┌───────────────────────────┐             ┌───────────────────────────┐             ┌───────────────────────────┐
        │     CLIENT DASHBOARD      │             │   SUPABASE DATABASE (DB)  │             │   WHATSAPP & AUTOMATION   │
        │                           │             │                           │             │                           │
        │ - React 18 Components     │ ◄─────────► │ - Supabase (PostgreSQL)   │ ◄─────────► │ - Meta Cloud API (v18.0)  │
        │ - 11 Module Views         │ useSupabase │ - 11 Relational Tables    │   Service   │ - n8n Webhook Listener    │
        │ - Pure CSS Tokens         │    Data     │ - Realtime WebSockets     │   Layer     │ - HMAC SHA-256 Signature  │
        └───────────────────────────┘             └───────────────────────────┘             └───────────────────────────┘
```

### Automation & Message Dispatch Sequence
```text
 [ CRM User / Event ] ──► [ Event Trigger ] ──► [ Opt-Out Check ] ──► [ Meta Cloud API ] ──► [ Parent Phone ]
                                 │                     │
                                 ▼                     ▼ (If Opted Out)
                        [ Condition Filter ]   [ Halt & Log SKIPPED ]
                                 │
                                 ▼
                        [ Execute Actions ]
                        ├── WhatsApp Template / Text / Media
                        ├── Update Inquiry Stage
                        └── Dispatch n8n Webhook (X-Spacece-Signature)
```

---

## 🗄️ Supabase Database Architecture

The CRM leverages **Supabase PostgreSQL** for robust backend data persistence. The schema is defined in [`supabase/schema.sql`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/supabase/schema.sql) and includes 11 relational tables:

1. **`contacts`**: Parent & student directory with phone numbers, class tagging, active status, and opt-out flags.
2. **`inquiries`**: Admission leads linked to contacts with pipeline stage tracking, follow-up dates, and notes.
3. **`messages`**: Inbound/outbound WhatsApp message thread history with timestamps and status.
4. **`templates`**: Meta WhatsApp message templates, approval status (`APPROVED`, `PENDING`, `REJECTED`), and categories.
5. **`campaigns`**: Bulk broadcast campaigns, targeted audiences, linked templates, and sent metrics.
6. **`media`**: Uploaded educational assets (images, videos, audio, documents) metadata and URLs.
7. **`whatsapp_settings`**: Meta Business credentials (WABA ID, Phone Number ID, tokens) and webhook verification config.
8. **`subscriptions`**: Plan tier limits, monthly usage quotas (contacts & messages), and renewal dates.
9. **`payment_history`**: Billing invoice records, payment dates, amounts, and statuses.
10. **`automation_rules`**: Trigger-action rules, evaluation conditions (JSONB), and execution counters.
11. **`automation_logs`**: Detailed audit logs of all executed automation rules and skipped triggers.

### Key Features:
- **Row-Level Security (RLS)**: Enforced across all tables to safeguard data access.
- **Indexes**: Optimized queries on key lookup fields (`phone`, `contact_id`, `pipeline_stage`, `timestamp`).
- **Realtime Listener**: Managed by custom hook [`useSupabaseData.ts`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/hooks/useSupabaseData.ts), subscribing to `postgres_changes` events.
- **Data Migration & Seeding**: [`dataMigrationService.ts`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/services/dataMigrationService.ts) auto-initializes and migrates legacy local data seamlessly to Supabase.

---

## 📁 Organized File Structure

```text
SpacECE CRM/
├── dist/                       # Compiled production build assets
├── public/                     # Static public assets
├── supabase/
│   └── schema.sql              # Supabase PostgreSQL schema with 11 tables, indexes & RLS policies
├── src/
│   ├── components/             # Reusable UI layout & modal components
│   │   ├── common/
│   │   │   └── DatabaseInspectorModal.tsx  # Developer Database JSON inspector modal
│   │   └── layout/
│   │       ├── Header.tsx      # Top bar with Meta status badge & global search
│   │       ├── MainLayout.tsx  # Main app layout orchestrator
│   │       └── Sidebar.tsx     # 11-module navigation drawer
│   ├── db/
│   │   ├── database.ts         # Local database schema definition & fallback
│   │   └── seed.ts             # Initial pre-seeded dataset
│   ├── hooks/
│   │   └── useSupabaseData.ts  # Custom hook with Supabase Realtime postgres_changes subscription
│   ├── lib/
│   │   └── supabase.ts         # Supabase client instantiation & env config
│   ├── pages/                  # 11 Core CRM Module Views
│   │   ├── AnalyticsView.tsx    # Live KPI cards, 7-day SVG chart, CSV export
│   │   ├── AutomationView.tsx   # Reactive rules table, 4-step wizard, n8n specs, audit logs
│   │   ├── CampaignsView.tsx    # 3-step broadcast wizard, opt-out validation
│   │   ├── ChatsView.tsx        # 3-panel WhatsApp inbox, thread composer, test receiver
│   │   ├── ContactsView.tsx     # Directory, duplicate phone check, CSV bulk import
│   │   ├── DashboardView.tsx    # Executive overview dashboard
│   │   ├── InquiriesView.tsx    # 4-stage Kanban lead board with drag-and-drop
│   │   ├── MediaLibraryView.tsx # Multi-format file storage, drag-and-drop upload, previews
│   │   ├── SettingsView.tsx     # Meta Business credentials, token masking & validation
│   │   ├── SubscriptionView.tsx # Live contact/message quota progress bars & invoices
│   │   └── TemplatesView.tsx    # Meta template manager, category filters, editor
│   ├── services/
│   │   ├── automationEngine.ts        # Reactive event execution engine & opt-out protection
│   │   ├── automationService.ts       # Supabase CRUD service for automation rules & logs
│   │   ├── campaignsService.ts        # Supabase CRUD service for broadcast campaigns
│   │   ├── contactsService.ts         # Supabase CRUD service for contacts directory
│   │   ├── dataMigrationService.ts    # Seed & auto-migration engine to Supabase
│   │   ├── inquiriesService.ts        # Supabase CRUD service for admission inquiries
│   │   ├── mediaService.ts            # Supabase CRUD service for media asset metadata
│   │   ├── messagesService.ts         # Supabase CRUD service for WhatsApp chat messages
│   │   ├── subscriptionService.ts     # Supabase CRUD service for subscription & quotas
│   │   ├── templatesService.ts        # Supabase CRUD service for WhatsApp templates
│   │   ├── whatsappService.ts         # Meta Cloud API message dispatch & incoming receiver
│   │   └── whatsappSettingsService.ts # Supabase CRUD service for WABA settings
│   ├── styles/
│   │   └── index.css            # Master design system & CSS variables
│   ├── App.tsx                  # Core router orchestrator
│   └── main.tsx                 # Application entry point
├── .env                         # Supabase & Meta API environment variables
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies & build scripts
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite configuration
```

---

## ⚡ Detailed Features & Module Specification

### 1. Settings & WhatsApp Business Connection ([`SettingsView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/SettingsView.tsx))
- **Credentials Form**: Display Name, Phone Number, Phone Number ID, WABA ID, and Access Token persisted in Supabase `whatsapp_settings`.
- **Access Token Masking**: Password-masked (`type="password"`) with an interactive **Show/Hide password toggle**.
- **Real Meta API Verification**: Verifies credentials against `https://graph.facebook.com/v18.0/{phoneNumberId}`. Updates global connection badge to **CONNECTED** (200 OK) or **DISCONNECTED** with diagnostic banners.

### 2. WhatsApp Inbox / Chats ([`ChatsView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/ChatsView.tsx))
- **3-Panel CRM Inbox Layout**: Left conversation list (search, All/Unread filter tabs, unread count badges, delivery checkmarks), Center thread & composer, Right parent profile sidepanel.
- **Supabase Realtime Messages**: Syncs conversation threads instantly via Supabase `messages` table subscriptions.
- **Incoming Simulation Tool**: Includes `receiveIncomingWhatsAppMessage` tool to simulate receiving incoming parent replies.

### 3. Inquiry / Lead Kanban Board ([`InquiriesView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/InquiriesView.tsx))
- **4 Kanban Pipeline Stages**: **New Inquiry** → **Contacted** → **Interested** → **Admitted**.
- **HTML5 Drag-and-Drop**: Drag lead cards between columns with instant Supabase database persistence (`inquiries` table).
- **Urgency Badges**: Red (*Overdue*), Amber (*Due Today*), Blue (*Due Tomorrow*), Slate (*Upcoming*).
- **5 Filter Tabs**: All Inquiries, Overdue Callbacks, Today's Tasks, Tomorrow's Tasks, Ongoing/Upcoming.

### 4. Contacts Directory & CSV Import ([`ContactsView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/ContactsView.tsx))
- **CRM Contact Directory**: Search by parent name, phone, or student class powered by `contactsService.ts`.
- **Duplicate Phone Prevention**: Pre-checks existing records in Supabase before saving new contacts.
- **Opt-Out Restrictions**: Toggle Opted Out status with red restriction badges (*"Opted Out - Restricts Messaging"*).
- **CSV Bulk Import Engine**: Upload CSV files (`Name, Phone, StudentClass, Tags, OptedOut`), pre-import validation table, and post-import summary report.

### 5. Message Templates Manager ([`TemplatesView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/TemplatesView.tsx))
- **Spacece Categories**: *Fee Reminder*, *Admission Confirmation*, *Event Invite*, *Holiday Notice*, *General Utility*.
- **Status Filter Tabs**: All, Approved (`APPROVED`), Pending Review (`PENDING`), Rejected (`REJECTED`).
- Template creation & editor modals initializing new templates in Supabase `templates` table as `PENDING`.

### 6. Broadcast Campaigns Wizard ([`CampaignsView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/CampaignsView.tsx))
- **3-Step Wizard Modal**: *Step 1 Choose Audience* → *Step 2 Choose Approved Template* → *Step 3 Review & Send*.
- **Opt-Out Exclusion**: Automatically calculates and excludes opted-out contacts in audience validation before dispatching.
- **Meta API Broadcast Dispatch**: Dispatches messages, updates sent counts, creates message logs in Supabase, and updates campaign status to `COMPLETED`.

### 7. Media Library Manager ([`MediaLibraryView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/MediaLibraryView.tsx))
- **Multi-Format Assets**: Images (`.jpg`, `.png`), Videos (`.mp4`), Audio (`.mp3`), and Documents (`.pdf`, `.docx`).
- Drag-and-drop upload zone, 50MB file size check, category filter tabs, search, and full-screen interactive preview viewer modal with metadata stored in Supabase `media` table.

### 8. Analytics & Reports Dashboard ([`AnalyticsView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/AnalyticsView.tsx))
- **Live Database KPI Cards**: Outbound Today, Inbound Today, Total Contacts, Active Campaigns queried directly from Supabase tables.
- **7-Day Message Volume Trend Chart**: Interactive SVG Bar chart comparing Outbound vs Inbound volume per day.
- **Connection Health & CSV Export**: Connection health card and 1-click **Export Report (CSV)** engine.

### 9. Subscription & Usage Quotas ([`SubscriptionView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/SubscriptionView.tsx))
- Live contact import capacity card (`Used / Limit`) and monthly template message usage card backed by Supabase `subscriptions`.
- Capacity progress bars with color-coded warning thresholds (*Teal*, *Amber*, *Red*).
- Quota limit alert banners and payment invoice history table (`payment_history` table).

### 10. Spacece Automation Engine ([`AutomationView.tsx`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/pages/AutomationView.tsx) & [`automationEngine.ts`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/src/services/automationEngine.ts))
- **Reactive Event Engine**: Triggers automations on CRM events (`INQUIRY_CREATED`, `INQUIRY_STAGE_CHANGED`, `CONTACT_CREATED`, `WHATSAPP_INCOMING`, `WHATSAPP_OUTGOING`).
- **Opt-Out Protection Safeguard**: Checks recipient `optedOut: true`. If opted out, strictly halts messaging and logs status **`SKIPPED`** (*"Skipped — Contact opted out of messaging"*) in `automation_logs`.
- **Idempotency Guard**: Prevents duplicate executions of identical event payloads within 10 seconds.
- **4-Step Rule Creation Wizard**: Basic Info → Choose Trigger → Conditions Builder (AND/OR logic) → Actions Builder (WhatsApp Templates, Text, Media, Stage Updates, n8n Webhooks).
- **n8n Webhook & Outbound API Portal**: Webhook URL & Signing Secret setup (with Eye show/hide toggle), interactive Payload Specifications (Text, Image, Document, List), and Execution Audit Logs table stored in Supabase.

---

## 🚀 Installation & Running Instructions

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account**: A active Supabase project (cloud or self-hosted)

### 2. Environment Setup

Create or update your `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# WhatsApp Cloud API Configuration
VITE_WHATSAPP_API_TOKEN=your-whatsapp-access-token
VITE_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# App Environment Configuration
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

### 3. Database Schema Setup

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to the **SQL Editor**.
3. Paste and run the contents of [`supabase/schema.sql`](file:///c:/Users/vimle/OneDrive/Desktop/SpacECE%20CRM/supabase/schema.sql) to create all 11 tables, indexes, and RLS policies.

### 4. Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/8vimlesh/SpacECE-CRM.git
cd SpacECE-CRM

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### 5. Production Build

```bash
# Compile TypeScript & build Vite client bundle
npm run build
```

---

## 📄 License & Attribution

Built for **Spacece India Foundation**. Distributed under the MIT License.