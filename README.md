# ♟️ IndiChessClone

A full-stack real-time online chess platform built using **Spring Boot (Backend)** and **React + Vite (Frontend)**.  
The project supports **authentication, matchmaking, real-time gameplay, and chat** using WebSockets.

---

## 🧩 Project Structure

IndiChessClone/
├── src/ # Backend (Spring Boot)
│ └── main
│ ├── java
│ │ └── com.IndiChess
│ │ ├── Config
│ │ ├── Controller
│ │ ├── Model
│ │ ├── Repository
│ │ ├── Security
│ │ ├── Service
│ │ └── IndiChessApplication.java
│ └── resources
│ └── application.properties
│
├── frontend/ # Frontend (React + Vite)
│ ├── public
│ ├── src
│ │ ├── components
│ │ ├── contexts
│ │ ├── hooks
│ │ ├── lib
│ │ ├── pages
│ │ ├── types
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── index.html
│ ├── package.json
│ ├── vite.config.ts
│ └── tailwind.config.ts
│
├── pom.xml
└── README.md


---

## 🚀 Features

### 🔹 Backend (Spring Boot)
- User Authentication (JWT + OAuth2)
- Matchmaking system
- Real-time game updates using **WebSockets**
- Live chat during matches
- Player ratings and match history
- Secure APIs with Spring Security

### 🔹 Frontend (React + Vite)
- Modern UI built with **React + TypeScript**
- State management using Context API
- Custom hooks for game logic
- Responsive design with Tailwind CSS
- Real-time updates via WebSocket connection

---

## 🛠️ Tech Stack

### Backend
- Java
- Spring Boot
- Spring Security
- WebSockets
- JPA / Hibernate
- PostgreSQL / MySQL

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Bun / npm

---

## ⚙️ How to Run Locally

### ▶ Backend
```bash
cd IndiChessClone
mvn spring-boot:run


Backend runs on:

http://localhost:8080

▶ Frontend
cd frontend
npm install
npm run dev


Frontend runs on:

http://localhost:5173

🔐 Environment Variables

Create .env in frontend/ if required:

VITE_API_BASE_URL=http://localhost:8080

📌 Future Improvements

Spectator mode

Tournament support

Move history replay

Mobile-friendly UI

Deployment with Docker

👩‍💻 Author

Kiran Jaiswal
Final Year | Full-Stack Developer
Focused on Java, Spring Boot, React, and System Design
