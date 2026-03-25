# 🎓 A to Z Education Platform

![Status](https://img.shields.io/badge/Status-Active-success)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Supabase-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A comprehensive Full-Stack EdTech solution designed to provide seamless learning experiences for students. Built with React (Vite) and Supabase (PostgreSQL), this platform offers robust features for both students and administrators.

---

## 🚀 Key Features

### 👨‍🎓 For Students
*   **Smart Dashboard (Updated)**:
    *   **Dynamic Class Selection**: Students can select their standard/class dynamically.
    *   **Subject Access**: Quick access to subjects based on selected class.
*   **Video Lessons (New Player)**:
    *   **Distraction-Free**: Custom player wrapper prevents external YouTube navigation.
    *   **Optimized UI**: Resized player with integrated "Previous" and "Next" lesson navigation.
    *   **Progress Tracking**: Sidebar indicates currently playing video.
*   **Test Center**: 
    *   Take practice tests and view results instantly.
    *   **Interactive PDF Viewer**: Built-in secure PDF viewer for question papers.
    *   **Answer Keys**: Access detailed solutions after submission.

### 👩‍🏫 For Administrators
*   **Admin Dashboard**: Comprehensive control panel to manage the platform.
*   **New: Manage Classes**:
    *   Add or remove standards/classes dynamically.
    *   Classes appear instantly on student dashboards.
*   **Announcements System**:
    *   Create and delete news updates for students.
    *   **External Links**: Attach clickable links to announcements for easy navigation to external recources.
*   **Content Management**:
    *   Upload and manage Video Lessons.
    *   **Test Upload System**: Drag-and-drop interface for uploading Question Papers (PDF) and Answer Keys.
*   **Access Control**: Secure email-based whitelist for admin privileges.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Tailwind CSS, Lucide React (Icons), Axios
*   **Backend**: Node.js, Express.js
*   **Database**: Supabase (PostgreSQL) - Replaces MongoDB
*   **Storage**: Supabase Storage / Local Uploads
*   **Authentication**: Google OAuth 2.0 / Supabase Auth
*   **Payments**: Razorpay Integration

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v14+)
*   Supabase Account

### 1. Database Setup (Supabase)
This project requires a Supabase instance.
1.  Create a new project on Supabase.
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Run the contents of `server/db_setup.sql`.
4.  **Important**: Run the contents of `server/setup_standards.sql` to enable the Class Management features.

### 2. Backend Configuration
Navigate to the server folder and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# ... other vars
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Configuration
Navigate to the client folder and install dependencies:
```bash
cd ../client
npm install
```

Start the frontend application:
```bash
npm run dev
# App runs on http://localhost:5173
```

---

## ⚠️ Known Issues / Pending

*   **Database Migration**: The `server/setup_standards.sql` script must be run manually in Supabase to create the `standards` table. If not run, "Add Class" will fail.
*   **Subject Management**: Currently, subjects (Maths, English, etc.) are hardcoded in the frontend. Future update will move this to the database.

---

## 🗂️ Project Structure

```
A-to-Z-Education/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application routes (StudentHome, AdminDashboard, etc.)
│   │   ├── context/        # React Context (Auth)
│   │   └── lib/            # Utilities
├── server/                 # Node.js Backend
│   ├── config/             # DB and App configuration
│   ├── controllers/        # Business logic
│   ├── models/             # Mongoose Schemas
│   ├── routes/             # API Endpoints
│   ├── uploads/            # Storage for PDFs (Gitignored)
│   └── data/               # JSON Fallback handling
└── README.md
```

## 🤝 Contribution

Contributions are welcome! Please fork the repository and create a pull request for any feature enhancements or bug fixes.

---

**Developed with ❤️ by Aditya Wagh**
