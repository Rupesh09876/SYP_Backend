# HAMS Platform Feature Flowmap

This flowchart visualizes the core architecture and feature sets available to each user role within the Hospital Management System (HAMS).

```mermaid
graph TD
    %% Global Entry
    Start((HAMS Portal)) --> Auth[Authentication & Security]
    Auth --> RoleRedirect{User Role Selection}

    %% Patient Role
    RoleRedirect -->|Patient| P_Dash[Patient Dashboard]
    P_Dash --> P_Apps[Appointment Management]
    P_Dash --> P_Reports[Medical Reports]
    P_Dash --> P_Billing[Billing & Khalti Payments]
    P_Dash --> P_Chat[Doctor Live Chat]
    P_Dash --> P_AI[Gemini AI Health Assistant]
    P_Dash --> P_Subs[Subscription & Premium Upgrade]
    
    P_AI --> P_Voice[Voice Assistant (Premium Only)]
    P_Reports --> P_Share[Secure Report Sharing]

    %% Doctor Role
    RoleRedirect -->|Doctor| D_Dash[Doctor Dashboard]
    D_Dash --> D_Apps[Scheduled Appointments]
    D_Dash --> D_Patients[Patient Clinical Profiles]
    D_Dash --> D_RepGen[Report Generation & Dispatch]
    D_Dash --> D_Chat[Patient Consultation Chat]
    D_Dash --> D_Video[ZegoCloud Video/Audio Calling]
    D_Dash --> D_Settings[Doctor Profile Settings]

    %% Admin Role
    RoleRedirect -->|Admin| A_Dash[Hospital Admin Dashboard]
    A_Dash --> A_Users[User Management (CRUD)]
    A_Dash --> A_Apps[Centralized Appointment Oversight]
    A_Dash --> A_Bill[Financial & Revenue Monitoring]
    A_Dash --> A_Reports[System-wide Analytics]

    %% Real-time Interaction Flow
    P_Chat <--> D_Chat
    P_Apps <--> D_Apps
    P_Apps <--> A_Apps
    D_Video <--> P_Dash

    %% Global Features
    Global{Global Infrastructure}
    Global --> Notif[Universal Notification System]
    Global --> WebRTC[Secure Signaling & Calling]
    Global --> API[Centralized REST API]
    
    Notif -.-> P_Dash
    Notif -.-> D_Dash
    Notif -.-> A_Dash

    %% Formatting
    style Auth fill:#3b5bdb,color:#fff,stroke:#1a1a2e,stroke-width:2px
    style RoleRedirect fill:#2f9e44,color:#fff,stroke:#1a1a2e,stroke-width:2px
    style Global fill:#e67700,color:#fff,stroke:#1a1a2e,stroke-width:2px
    style P_Dash fill:#e7f5ff,stroke:#3b5bdb
    style D_Dash fill:#ebfbee,stroke:#2f9e44
    style A_Dash fill:#fff9db,stroke:#f59f00
```

## Key Modules Description

### 1. Patient Module
- **Dashboard**: High-level overview of health stats and upcoming visits.
- **AI Assistant**: Personalized health guidance powered by Google Gemini.
- **Billing**: Secure Khalti payment gateway integration for premium services.
- **Secure Reports**: Digital storage and one-click sharing of medical findings.

### 2. Doctor Module
- **Virtual Consultations**: Fully encrypted real-time audio/video calls via ZegoCloud.
- **Patient Profiles**: Access to historical records to inform better clinical decisions.
- **Report Generation**: Digital prescription and report issuing system.

### 3. Admin Module
- **User Control**: Full control over hospital registry for doctors and patients.
- **Oversight**: Real-time monitoring of hospital operations and revenue.
- **Analytics**: Deep insights into hospital efficiency and service usage.

### 4. Global Infrastructure
- **Real-time Notifications**: Polling and WebSocket notifications for all roles.
- **Encrypted Signaling**: Secure channel management for P2P interactions.
- **SEO & Performance**: Vite-optimized frontend for rapid load times across all devices.
