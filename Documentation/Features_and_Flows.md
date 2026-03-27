# HAMS Features and Flows
## Functional Breakdown & Technical Architecture

The HAMS platform is built to handle complex hospital workflows with simplicity and security.

### 1. User Authentication & Role Management
- **Security**: JWT-based authentication with high-entropy secrets.
- **Roles**: Admin, Doctor, Patient.
- **Workflow**:
  - Admin creates Doctor profiles.
  - Doctors use default credentials for first login.
  - RBAC (Role-Based Access Control) gates all API endpoints.

---

### 2. Appointment Booking System
- **Real-time Availability**: Doctors set their schedule in the Doctor Dashboard.
- **Seamless Booking**: Patients can view available slots and book instantly.
- **Conflict Prevention**: Centralized database logic (Drizzle ORM) prevents overlapping or duplicate bookings.

---

### 3. AI Health Assistant & Voice Support
- **AI Core**: Google Gemini 1.5 Flash.
- **Secure Proxy**: Backend-only API communication to protect sensitive keys.
- **Premium Tier**: Feature-gated for premium subscribers.
- **Voice Assistant**: Specialized module for voice-to-text health queries.

---

### 4. Audio/Video Consultations
- **Provider**: ZegoCloud (Production SDK).
- **Features**: Global incoming call UI, ringtone alerts, and robust state cleanup.
- **Logic**: Integrated into the Patient and Doctor dashboards for "one-click" consultations.

---

### 5. Billing & Revenue Management
- **Payment Gateway**: Khalti Integrated (Production).
- **Automated Bills**: Generated instantly after appointments or subscription upgrades.
- **Admin Dashboard**: Real-time revenue reporting with monthly and annual breakdowns.

---
*Created by Antigravity AI - HAMS Production Deployment Phase*
