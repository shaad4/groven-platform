# 🌿 Groven Platform: Comprehensive Feature Guide

This document outlines every feature, architectural capability, and user flow built into the Groven B2B SaaS platform. Groven is a premium, multi-tenant client request management application designed for agencies, freelancers, and service teams to provide a white-labeled experience to their clients.

---

## 1. Multi-Tenant Architecture & Global Identity
Groven employs a strict multi-tenant architecture designed to keep data completely isolated while providing a seamless user experience.
* **Subdomain Routing**: Every provider/agency gets their own dedicated subdomain (e.g., `agency.groven.in`). The frontend intelligently detects the subdomain to route users either to the generic Landing/Provider portal or the isolated Client Portal.
* **Global User Identity**: A single user account can belong to multiple workspaces across different subdomains. Users don't need multiple passwords; they authenticate once and can switch between workspaces effortlessly via the **Portal Switcher**.
* **Strict Tenant Scoping**: Django middleware intercepts every request, verifying the subdomain against the user's tenant memberships to strictly enforce data isolation at the database query level.

## 2. White-Labeled Client Portals
Providers can offer their clients a bespoke, branded experience.
* **Dynamic Theming**: Providers can upload their custom brand logo and define a hex accent color from their settings.
* **Global CSS Injection**: The selected accent color dynamically generates interactive hover states, focus rings, buttons, and status badges across the client portal.
* **Isolated Environment**: Clients only see their own requests and communicate directly with the provider, oblivious to the provider's other clients.

## 3. Real-Time Request Management (WebSockets)
Say goodbye to page refreshes. The core request management engine is entirely real-time.
* **Django Channels & Daphne**: WebSockets stream updates instantly to all connected clients in a workspace.
* **Live Feed**: Comments, status changes (e.g., "In Progress", "Completed"), and new requests appear instantly on both the Provider and Client dashboards without polling.
* **Activity Tracking**: Every action generates an activity log that is broadcasted over the WebSocket layer, ensuring total transparency.

## 4. Progressive Web App (PWA) & Mobile UX
Groven is fully installable as a native-like application on Desktop, iOS, and Android.
* **Smart Install Prompts**: A globally injected `PwaInstallPrompt` detects the user's OS and Browser. It displays native "Install App" buttons for Android/Desktop, and visual step-by-step "Share > Add to Home Screen" instructions for iOS Safari.
* **Offline Caching**: Service workers (`sw.js`) cache critical assets, enabling rapid load times and offline fallback pages.
* **Mobile-First Design**: The interface transforms into a touch-friendly app layout on small screens, utilizing floating bottom navigation bars, full-screen mobile modals, and responsive 2-column grid cards.

## 5. Interactive Onboarding Engine
To reduce time-to-value, Groven includes a robust guided walkthrough system.
* **Context-Aware Tours**: Powered by `reactour`, the walkthrough system visually highlights specific UI elements (via `data-tour` attributes) and explains core concepts (like the Dashboard, AI Badges, and Request flows).
* **Role-Specific Guides**: Providers get a different onboarding experience than Clients.
* **Replay Functionality**: Users can replay the walkthrough at any time from their profile settings modal.

## 6. AI-Powered Client Management
Groven leverages OpenAI integrations to automate tedious management tasks.
* **Smart Summaries**: Long request descriptions or comment threads are automatically summarized into digestible bullet points.
* **Categorization**: Incoming requests are automatically tagged with relevant categories.
* **AI Badges**: UI indicators highlight AI-generated insights so providers can quickly scan their active request pipeline.

## 7. Production-Grade Transactional Emails
Email communication is handled asynchronously for maximum performance.
* **Celery & Redis**: All emails are offloaded to background worker queues.
* **Unified Premium Templates**: HTML email templates for Invitations, Password Resets, Email Verification, and Notification Summaries are styled with a consistent, high-contrast, premium SaaS layout utilizing the unified Groven brand identity.
* **Dynamic Branding**: Client invitation emails automatically inject the specific Provider's workspace name to maintain context.

## 8. Stripe Subscription Billing
Automated SaaS billing infrastructure is built-in.
* **Tiered Plans**: Support for Free and Pro plans, which dictate usage limits (e.g., number of active clients allowed).
* **Stripe Webhooks**: Asynchronous webhooks listen for subscription upgrades, cancellations, or payment failures, updating the tenant's plan status in the database instantly.
* **Graceful Gatekeeping**: Providers hitting their plan limits are prompted with beautifully designed Upgrade Modals to convert them to paid tiers.

## 9. Global Superadmin Portal
A fully isolated administrative dashboard located at `/grove-admin`.
* **Platform Overview**: Superadmins can monitor all active tenants, track MRR (Monthly Recurring Revenue), and view total user counts.
* **Plan Management**: Create, edit, and sync Stripe Pricing Plans directly from the UI.
* **Tenant Management**: Superadmins can inspect tenant health, suspend abusive workspaces, or manually upgrade/downgrade plans.

## 10. Linear-Inspired Premium UI/UX
The frontend is built using React 18, Tailwind CSS v4, and Framer Motion for a stunning aesthetic.
* **Glassmorphism & Gradients**: Subtle background blurs, ambient glow effects, and crisp borders mimic top-tier Silicon Valley applications.
* **Micro-Animations**: Smooth layout transitions, fade-ups, hover lifts, and an infinite-scrolling marquee on the landing page make the application feel alive and responsive.
* **Outfit Typography**: A clean, modern sans-serif typeface used uniformly across the platform.

## 11. Security & Authentication
* **JWT Authentication**: Short-lived access tokens and secure HTTP-only refresh cookies.
* **Role-Based Access Control (RBAC)**: Enforced at both the React Route level and the Django View level (e.g., `ProviderPermission`, `ClientPermission`).
* **Password Strength Meter**: Real-time visual feedback on password complexity requirements during signup and reset flows.

## 12. Deployment & Performance Optimizations
Groven is optimized for rapid loading and scalability.
* **Code Splitting**: Routes are dynamically loaded via `React.lazy` and `Suspense`, massively reducing the initial JavaScript bundle size.
* **Nginx Gzip & Caching**: Nginx is configured to apply aggressive GZIP compression and long-term immutable caching (`Cache-Control`) for Vite-compiled assets.
* **Database Pooling**: PostgreSQL uses persistent connection pooling (`CONN_MAX_AGE`) to eliminate connection overhead on the Django backend.
