# HAMS - Project Wireframes & UI Blueprints
## Structural Design for All System Pages

This document provides low-fidelity wireframes and structural blueprints for the HAMS platform, serving as a roadmap for the front-end implementation.

---

### 🔐 1. Authentication & Onboarding
**Pages**: Login, Registration, Forgot Password.

#### **Layout Structure**
```mermaid
graph TD
    A[Logo Section] --> B[Input: Username]
    B --> C[Input: Password]
    C --> D[Select: Role - Patient/Doctor/Admin]
    D --> E[Button: Login]
    E --> F[Link: Register/Forgot Password]
```

---

### 🏥 2. Patient Portal
**Pages**: Dashboard, Appointments, AI Assistant, Reports.

#### **Blueprint: Patient Dashboard**
![Patient Dashboard Wireframe](./Artifacts/Sprint1_Core/Patient_Dashboard_Wireframe.png)

#### **Layout: Appointment Booking**
| Header | Sidebar | Main Content |
| :--- | :--- | :--- |
| **HAMS Patient** | Dashboard | **Book Appointment** |
| Profile | Appointments | [Select Department V] |
| Logout | Reports | [Select Doctor V] |
| | AI Assistant | [Calendar View] -> [Available Slots] |
| | | [Button: Confirm Booking] |

#### **Layout: My Appointments & History**
- **Tabs**: [Upcoming] [Completed] [Cancelled]
- **List View**:
  - [Date] | [Doctor Name] | [Department] | [Status]
  - 2023-10-28 | Dr. Sarah Chen | Cardiology | Confirmed
- **Actions**: [Reschedule] [Cancel] [View Report]

#### **Layout: Health Records & Reports**
- **Search**: [Input: Search by Date or Type]
- **Table**:
  - [Date] | [Report Title] | [Doctor] | [Download]
  - 2023-10-20 | Blood Test Results | Dr. Sarah Chen | [PDF Icon]

---

### 👨‍⚕️ 3. Doctor Workspace
**Pages**: Dashboard, Schedule Management, Patient Consultation (EHR).

#### **Blueprint: Schedule Configuration**
```mermaid
graph LR
    A[Calendar Grid] --> B[Time Slot: 08:00 - 09:00]
    B --> C{Status?}
    C -- Available --> D[Action: Mark Busy]
    C -- Booked --> E[Action: View Patient]
    E --> F[Button: Start Consultation]
```

#### **Blueprint: Patient Consultation (EHR)**
```mermaid
graph TD
    A[Patient Info: Name/Age/Blood] --> B[Symptoms: Text Area]
    B --> C[Diagnosis: Text Area]
    C --> D[Prescription: Dynamic List]
    D --> E[Button: Save EHR & Generate PDF]
```

#### **Layout: Patient Queue & Active Consultations**
- **Sidebar**: [Queue Name] [Wait Time] [Priority]
- **Main**: [Active Video Call (ZegoCloud placeholder)]
- **Right Panel**: [Quick Stats] [Previous Reports History]

---

### 📊 4. Admin Command Center
**Pages**: Dashboard, User Management, Subscription Tiers.

#### **Layout: Revenue & Billing Dashboard**
| Metric Card | Metric Card | Metric Card |
| :--- | :--- | :--- |
| **Total Revenue** | **Active Users** | **Pending Bills** |
| $12,450.00 | 1,240 | 15 |

**Data Table: Recent Transactions**
- [ID] | [Patient Name] | [Amount] | [Status]
- #101 | John Doe | $150.00 | Paid (Khalti)
- #102 | Jane Smith | $200.00 | Pending

#### **Layout: User Management**
- **Filters**: [Select Role] [Status: Active/Inactive] [Search Name]
- **Actions**: [Edit User] [Reset Password] [Deactivate]
- **Table**: [Avatar] | [Name] | [Role] | [Email] | [Join Date]

#### **Layout: Subscription Management**
```mermaid
graph LR
    A[Current Tiers] --> B[Free]
    A --> C[Basic]
    A --> D[Premium]
    B --> E[Edit Limits]
    C --> F[Edit Price/Features]
    D --> G[Manage AI/Voice Access]
```

---

### 👤 5. Profile & Settings (Universal)
**Structural Layout**
- **Personal Info**: [Avatar Upload] [Name] [Phone] [Address]
- **Security**: [Change Password] [Two-Factor Toggle]
- **Preferences**: [Theme: Light/Dark] [Language Select]

---

### 🤖 6. AI Voice Assistant (Modal)
**Structural Layout**
- **Header**: [AI Icon] "Health Assistant" [Close X]
- **Body**: [Waveform Visualization] (Pulsating Orb)
- **Transcription**: "Listening... Speak your health query."
- **Actions**: [Mic Mute] [Manual Input] [Clear Transcript]

---
*Created by Antigravity AI - HAMS UI/UX Blueprint Phase*
