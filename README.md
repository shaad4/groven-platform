<div align="center">

<img src="https://img.shields.io/badge/Groven-Client%20Management-0F6E56?style=for-the-badge&logo=leaf&logoColor=white" alt="Groven" />

# 🌿 Groven
### Multi-Tenant Client Management SaaS

*One workspace per client. Every request tracked. Zero chaos.*

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)

</div>

---

## What is Groven?

Groven gives freelancers and agencies a branded subdomain workspace (`agency.groven.in`). Clients get an isolated portal to submit requests, track progress, and communicate — without ever seeing another client's data.

```
Provider Dashboard          Client Portal
─────────────────           ──────────────
All clients in one view     Submit requests
Manage request pipeline     Track status live
Chat with each client       Chat with provider
Live notification feed      Get notified instantly
Analytics & insights        Multi-portal switcher
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, Django 5, Django REST Framework |
| **Realtime** | Django Channels, Daphne (ASGI), WebSockets |
| **Frontend** | React 18, Redux Toolkit |
| **Database** | PostgreSQL 16 |
| **Cache/Queue** | Redis 7, Celery, Celery Beat |
| **Payments** | Stripe (subscriptions + webhooks) |
| **Auth** | JWT (SimpleJWT), Google OAuth |
| **Infra** | Docker, Nginx, AWS EC2 |
| **CI/CD** | GitHub Actions |
| **AI** | OpenAI — summaries, categorisation, reply suggestions |

---

## Architecture

```
Browser
  │
  ├─ HTTP  ──▶  Nginx  ──▶  Gunicorn  ──▶  Django + DRF  ──▶  PostgreSQL
  │                                                          ──▶  Redis (cache)
  │
  └─ WS   ──▶  Nginx  ──▶  Daphne  ──▶  Django Channels
                                              │
                                         Redis (channel layer)
                                              │
                                        Celery Workers ◀── Redis (broker)
                                              │
                                         Celery Beat (scheduled tasks)
```

---

## Key Features

- 🏢 **Multi-tenancy** — full data isolation per tenant via `tenant_id` scoping
- 🌐 **Global Identity** — one account works across all provider portals
- ⚡ **Real-time** — WebSocket-powered live feed, zero polling
- 📧 **Invite system** — branded invite emails, 48hr token expiry
- 🤖 **AI layer** — auto-summary, categorisation, reply suggestions via OpenAI
- 💳 **Billing** — Stripe subscriptions, Free vs Pro plan enforcement
- 🔐 **Secure** — JWT auth, subdomain middleware, tenant membership checks on every request

---

## Local Development

```bash
# Clone and setup
git clone https://github.com/shaad4/grove-platform.git
cd grove-platform
cp .env.example .env

# Start all services
docker compose up -d

# Run migrations
docker compose exec backend python manage.py migrate

# Frontend
cd frontend && npm install && npm run dev
```

> Groven uses `lvh.me` for local subdomain routing — `tenant.lvh.me:5173` resolves to `127.0.0.1` with no hosts file changes needed.

---

## Environment Variables

```env
SECRET_KEY=
DATABASE_URL=
REDIS_URL=
FRONTEND_URL=https://groven.in
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
```

---

## Deployment

Runs on AWS EC2 behind Nginx with Docker Compose. Wildcard SSL cert (`*.groven.in`) via Let's Encrypt covers all tenant subdomains automatically.

```bash
docker compose up -d --build backend daphne celery_worker celery_beat
docker compose restart nginx
```

CI/CD via GitHub Actions — every push to `develop` auto-deploys to EC2.

---

## Plans

| | Free | Pro |
|--|------|-----|
| Clients | 3 | Unlimited |
| Active Requests | 10 | Unlimited |
| Real-time feed | ✅ | ✅ |
| AI features | ❌ | ✅ |
| White-labeling | Basic | Full |

---

<div align="center">

Built with 🌿 by the Groven team · [groven.in](https://groven.in)

</div>
