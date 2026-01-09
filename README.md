# Realtime Collaboration Platform

A full-stack web application designed to enable real-time collaboration among users. The platform includes features such as user authentication, collaborative drawing, and communication in shared rooms.

---

## Features

- **User Authentication**: Secure registration, login, and logout functionality using JWT.
- **Real-Time Collaboration**: Users can join rooms and collaborate in real-time using WebSockets.
- **Collaborative Drawing**: A drawing canvas that synchronizes across users in the same room.
- **Chat Functionality**: Real-time chat with emoji support and typing indicators.
- **Collaboration Requests**: Users can send and accept collaboration invitations.
- **Protected Routes**: Ensures only authenticated users can access certain pages.
- **Responsive Design**: Built with React and styled for a seamless user experience.

---

## Tech Stack

### Backend
- **Node.js**: Server-side runtime.
- **Express.js**: Web framework for building RESTful APIs.
- **Socket.IO**: Enables real-time, bidirectional communication.
- **MongoDB**: Database for storing user and collaboration data.
- **JWT**: Secure user authentication.
- **Mongoose**: ODM for MongoDB.

### Frontend
- **React.js**: Component-based UI library.
- **Vite**: Fast development server and build tool.
- **React Router**: For managing navigation and routing.
- **Context API**: For managing authentication and socket state.
- **GSAP**: For animations in the UI.

---

## Folder Structure

### Backend
- `server.js`: Main server file, sets up Express, Socket.IO, and routes.
- `routes/`: Contains API routes for authentication and user management.
  - `auth.js`: Handles user registration, login, and logout.
  - `users.js`: Provides user-related endpoints.
- `models/`: MongoDB models for data persistence.
  - `User.js`: Schema for user data.
- `middleware/`: Middleware for authentication and other utilities.
  - `auth.js`: Verifies JWT tokens for protected routes.

### Frontend
- `src/`: Contains React components, pages, and context providers.
  - `components/`: Reusable UI components like `ChatBox`, `DrawingCanvas`, and `CollaborationRequest`.
  - `contexts/`: Context providers for authentication and socket management.
    - `AuthContext.jsx`: Manages user authentication state.
    - `SocketContext.jsx`: Manages WebSocket connections.
  - `pages/`: Page components like `Login`, `Register`, `Home`, and `Collaboration`.

---

## Installation

### Prerequisites
- Node.js and npm installed.
- MongoDB instance running locally or in the cloud.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/realtime-collab-platform.git
   cd realtime-collab-platform
   ```

2. Install dependencies:
   - Backend:
     ```bash
     cd backend
     npm install
     ```
   - Frontend:
     ```bash
     cd ../frontend
     npm install
     ```

3. Set up environment variables:
   - Create `.env` files in both `backend` and `frontend` directories.
   - Backend `.env` example:
     ```
     MONGODB_URI=mongodb://localhost:27017/realtime-collab
     JWT_SECRET=your-secret-key
     ```
   - Frontend `.env` example:
     ```
     VITE_API_URL=http://localhost:5000
     ```

4. Start the development servers:
   - Backend:
     ```bash
     cd backend
     npm start
     ```
   - Frontend:
     ```bash
     cd frontend
     npm run dev
     ```

5. Open the application in your browser:
   ```
   http://localhost:3000
   ```

---

## Deployment

The project is configured for deployment on **Vercel**. Ensure the `.env` files are set up in the Vercel dashboard for both frontend and backend.

---

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

---

## License

This project is licensed under the MIT License.

---