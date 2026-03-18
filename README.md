# 🎓 A to Z Education Platform

![Status](https://img.shields.io/badge/Status-Active-success)
![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue)
![License](https://img.shields.io/badge/License-MIT-green)

A comprehensive Full-Stack EdTech solution designed to provide seamless learning experiences for students from Standards 2 to 10. Built with the MERN stack (MongoDB, Express, React, Node.js), this platform offers robust features for both students and administrators.

---

## 🚀 Key Features

### 👨‍🎓 For Students
*   **Smart Dashboard**: Personalized welcome screen with quick access to current standard and subjects.
*   **Video Lessons**: Integrated YouTube player for distraction-free learning across Maths, English, Marathi, and Intelligence.
*   **Test Center**: 
    *   Take practice tests and view results instantly.
    *   **Interactive PDF Viewer**: Built-in secure PDF viewer for question papers.
    *   **Answer Keys**: Access detailed solutions after submission.
*   **Progress Tracking**: Visual indicators of learning progress.

### 👩‍🏫 For Administrators
*   **Admin Dashboard**: comprehensive control panel to manage the platform.
*   **Content Management**:
    *   Upload and manage Video Lessons.
    *   **Test Upload System**: Drag-and-drop interface for uploading Question Papers (PDF) and Answer Keys.
    *   **Dual Storage Reliability**: Automatic fallback to local JSON storage if the database is unavailable, ensuring 100% uptime for critical uploads.
*   **Access Control**: Secure email-based whitelist for admin privileges.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Tailwind CSS, Lucide React (Icons), Axios
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Primary) + JSON File System (Fallback/Redundancy)
*   **Storage**: Local file upload handling with `express-fileupload`
*   **Authentication**: Google OAuth 2.0 via `@react-oauth/google`
*   **Payments**: Razorpay Integration (Ready)

---

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v14+)
*   MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/AdityaWagh06/A-to-Z-Education-.git
cd A-to-Z-Education-
```

### 2. Backend Configuration
Navigate to the server folder and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_ORIGIN=http://localhost:5173
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

Create a `.env` file in the `client/` directory (optional, or rely on defaults):
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the frontend application:
```bash
npm run dev
# App runs on http://localhost:5173
```

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
