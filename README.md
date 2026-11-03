# FacultyConnect – Smart Staff Availability & Room Locator

FacultyConnect is a smart campus management platform designed to help students find faculty members, check their availability, locate staff rooms, view schedules, and request appointments.

The platform provides separate dashboards for students, faculty members, and administrators to simplify communication and improve campus accessibility.

## 🚀 Key Features

### 👨‍🎓 Student
- Student registration and secure login.
- Search faculty members by name and department.
- View faculty availability and schedules.
- Locate faculty rooms on the campus map.
- Request appointments with faculty members.
- Track appointment status and history.

### 👨‍🏫 Faculty
- Secure faculty login.
- Update availability status.
- Manage personal schedules.
- View student appointment requests.
- Approve or reject appointment requests.
- Mark approved appointments as completed.

### 🛡️ Administrator
- Admin dashboard.
- Manage faculty information.
- Add and manage campus rooms.
- Assign rooms to faculty members.
- View and manage appointment requests.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Backend | Python, FastAPI |
| Database | SQLite / PostgreSQL |
| ORM | SQLModel |
| Authentication | JWT |
| Campus Map | React Leaflet |
| API Communication | REST API |
| Real-time Support | WebSocket |

## 🏗️ System Architecture

```text
             STUDENT / FACULTY / ADMIN
                         |
                         v
                  REACT FRONTEND
                         |
                         v
                  FASTAPI BACKEND
                         |
              ---------------------
              |         |         |
              v         v         v
          AUTH       STAFF    APPOINTMENTS
              |         |         |
              ---------------------
                         |
                         v
                    SQLMODEL
                         |
                         v
                 DATABASE LAYER
                 SQLite / PostgreSQL
```

## 📁 Project Structure

```text
FacultyConnect/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── realtime.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── style.css
│   ├── package.json
│   └── index.html
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Selvaganapathy-k/FacultyConnect.git
cd FacultyConnect
```

### 2. Backend Setup

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Backend API:

`http://127.0.0.1:8000`

API Documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend:

`http://localhost:5173`

## 🗄️ Database

FacultyConnect uses SQLModel for database operations.

Supported database configurations:
- SQLite for local development.
- PostgreSQL for cloud deployment.

## 🔐 Security

- JWT-based authentication.
- Password hashing.
- Role-based access control.
- Protected API endpoints.
- Environment-based configuration for sensitive credentials.

## ☁️ Deployment

Planned deployment architecture:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL

## 🎯 Project Objective

The main objective of FacultyConnect is to reduce the time and effort students spend searching for faculty members across campus.

It provides a centralized platform for faculty availability tracking, room navigation, schedule management, and appointment coordination.

## 👨‍💻 Developer

**Selvaganapathy K**

GitHub: [Selvaganapathy-k](https://github.com/Selvaganapathy-k)

---

**FacultyConnect – Connecting Students and Faculty Smarter.**