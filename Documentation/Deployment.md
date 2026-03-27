# Deployment & Production Verification
## HAMS Infrastructure Overview

The HAMS platform is deployed as a distributed system with a decoupled Frontend and Backend.

### 🌐 Live Links
| Component | Hosting | Status | URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel | 🟢 LIVE | [HAMS Frontend (Vercel)](https://syp-frontend-lovat.vercel.app) |
| **Backend** | Render | 🟢 LIVE | [HAMS Backend (Render)](https://syp-backend.onrender.com) |

---

### ⚙️ Production Configurations
#### **Frontend (Vercel)**
- **SPA Routing**: Handled via `vercel.json` to prevent 404s on direct navigation.
- **Environment**: Points to the Render backend for production data.

#### **Backend (Render)**
- **Database**: PostgreSQL with Drizzle ORM.
- **CORS**: Configured to whitelist `https://syp-frontend-lovat.vercel.app`.
- **Security**: Full Helmet.js implementation and Rate Limiting enabled.

---

### ✅ Deployment Checklist (Complete)
- [x] Vercel SPA Routing Configuration.
- [x] Khalti Payment Return URL (Dynamic Origin).
- [x] ZegoCloud Audio/Video stability in production.
- [x] Gemini AI Backend Proxy (JWT Secured).
- [x] Database Migration from Local to Cloud.

---
*Last Verified: 2026-03-27*
