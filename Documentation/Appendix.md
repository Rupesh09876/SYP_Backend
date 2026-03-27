# Project Appendix - HAMS
## Technical Reference & Glossary

This appendix provides additional context, technical specifications, and reference materials for the HAMS platform.

---

### 📚 1. Glossary of Terms
| Term | Description |
| :--- | :--- |
| **RBAC** | Role-Based Access Control - User permissions based on Admin, Doctor, or Patient roles. |
| **EHR** | Electronic Health Record - Digital version of a patient's paper chart. |
| **SPA** | Single Page Application - A web app that loads a single HTML page and dynamically updates. |
| **JWT** | JSON Web Token - A compact, URL-safe means of representing claims to be transferred between two parties. |
| **CORS** | Cross-Origin Resource Sharing - A system that lets servers specify who can access their resources. |

---

### 🛠️ 2. Technical Stack
- **Frontend**: React (Vite), Lucide React (Icons), Axios, Tailwind (Optional/Vanilla CSS).
- **Backend**: Node.js, Express, Drizzle ORM.
- **Database**: PostgreSQL (Supabase/Neon/Render Managed).
- **Hosting**: Vercel (Frontend), Render (Backend).
- **AI**: Google Gemini 1.5 Flash.
- **Communication**: ZegoCloud (Video/Audio Calling).
- **Payments**: Khalti API.

---

### 🔐 3. Environment Variable Reference
#### **Backend (.env)**
- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET`: High-entropy string for token signing.
- `GEMINI_API_KEY`: Google AI Studio key for health assistance.
- `ZEGO_APP_ID` / `ZEGO_SERVER_SECRET`: Credentials for video calling.
- `KHALTI_SECRET_KEY`: Private key for payment verification.

#### **Frontend (.env)**
- `VITE_API_BASE_URL`: Pointer to the Render backend (e.g., `https://syp-backend.onrender.com`).
- `VITE_ZEGO_APP_ID`: Public AppID for the ZegoCloud UI Kit.

---

### 🚥 4. API Endpoint Reference (Key Routes)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticates user and returns JWT. |
| `GET` | `/api/patients/dashboard` | Fetches patient-specific health and appointment data. |
| `POST` | `/api/ai/chat` | Secure proxy for Gemini AI health queries (Premium only). |
| `POST` | `/api/payments/khalti/initiate` | Starts the Khalti payment flow. |

---

### ❓ 5. Troubleshooting & FAQ
**Q: Why do I get a 404 on page refresh in production?**
*A: This is common in SPAs. Ensure `vercel.json` is correctly configured to redirect all routes to `index.html`.*

**Q: Why is the AI Chat returning a 403 Forbidden?**
*A: Check if the user has a "Premium" subscription tier and ensure the `GEMINI_API_KEY` is set in the Render environment variables.*

---
*Created by Antigravity AI - HAMS Technical Documentation Phase*
