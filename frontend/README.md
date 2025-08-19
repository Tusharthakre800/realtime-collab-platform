realtime-collab-platform/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   └── User.js          # User schema for MongoDB
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   └── users.js         # User management endpoints
│   ├── server.js            # Main server file with Socket.IO
│   ├── package.json         # Backend dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBox.jsx         # Real-time chat component
│   │   │   ├── CollaborationRequest.jsx  # Collaboration invitation system
│   │   │   ├── DrawingCanvas.jsx   # Main drawing canvas component
│   │   │   └── ProtectedRoute.jsx  # Route protection component
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx     # Authentication state management
│   │   │   └── SocketContext.jsx   # Socket.IO connection management
│   │   ├── pages/
│   │   │   ├── Collaboration.jsx   # Main collaboration room page
│   │   │   ├── Home.jsx           # Dashboard/home page
│   │   │   ├── Login.jsx          # User login page
│   │   │   └── Register.jsx       # User registration page
│   │   ├── App.jsx                # Main application component
│   │   └── main.jsx               # Application entry point
│   ├── package.json               # Frontend dependencies
│   └── vite.config.js             # Vite configuration
└── package.json                   # Root package.json for scripts

##  Usage Guide
### User Registration & Login
1. 1.
   Navigate to the registration page to create a new account
2. 2.
   Login with your credentials to access the dashboard
### Starting a Collaboration
1. 1.
   From the Home page , you can:
   
   - See who's currently online
   - Send collaboration requests to other users
   - Accept incoming collaboration invitations
2. 2.
   In a Collaboration Room :
   
   - Use the drawing tools to create art
   - Adjust brush size and colors
   - Switch between brush and eraser modes
   - Chat with collaborators in real-time
   - Save your work as PNG images
   - Clear the canvas when needed
### Drawing Features
- Color Selection : Use the color picker to choose any color
- Brush Size : Adjust brush size from 1-20 pixels
- Eraser : Toggle between drawing and erasing modes
- Canvas : Responsive canvas that works on all devices
- Touch Support : Full touch support for mobile devices
- Real-time Sync : See other users' drawings instantly
### Collaboration Features
- Real-time Updates : All changes are synchronized instantly
- User Presence : See who's currently in the room
- Chat System : Communicate with collaborators via text
- Room Persistence : Canvas state is saved automatically
- Export : Download your collaborative artwork as PNG
## 🔧 API Endpoints
### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - User login
- GET /api/auth/verify - Verify JWT token
### Users
- GET /api/users - Get all users (authenticated)
- GET /api/users/online - Get online users
### Socket.IO Events Client to Server
- user-online - Mark user as online
- send-collaboration-request - Send collaboration invitation
- accept-collaboration - Accept collaboration request
- join-room - Join a collaboration room
- drawing-data - Send drawing data
- chat-message - Send chat messages
- save-canvas-state - Save canvas state Server to Client
- collaboration-request - Receive collaboration invitation
- collaboration-accepted - Collaboration request accepted
- drawing-data - Receive drawing updates
- chat-message - Receive chat messages
- canvas-state - Receive saved canvas state
- user-status-changed - User online/offline status updates
## 🎨 UI/UX Features
### Responsive Design
- Desktop : Full-featured interface with sidebar navigation
- Tablet : Optimized layout for touch interaction
- Mobile : Streamlined interface with touch-friendly controls
### Animations
- GSAP Animations : Smooth transitions and micro-interactions
- Loading States : Animated loading indicators
- Hover Effects : Interactive feedback on all buttons
- Canvas Animations : Smooth drawing and clearing animations
### Color Scheme
- Dark Theme : Modern dark theme with blue accents
- Consistent Styling : Unified color palette throughout
- Accessibility : High contrast for better visibility
## 🔐 Security Features
- JWT Authentication : Secure token-based authentication
- Password Hashing : bcryptjs for secure password storage
- CORS Protection : Configured for production security
- Input Validation : Server-side validation for all inputs
- Socket.IO Security : Authenticated socket connections
## 🐛 Troubleshooting
### Common Issues
1. 1.
   Socket Connection Issues
   
   - Ensure backend server is running on port 5000
   - Check CORS configuration in server.js
   - Verify frontend is connecting to correct backend URL
2. 2.
   MongoDB Connection
   
   - Ensure MongoDB is running locally
   - Check MONGODB_URI in .env file
   - Verify MongoDB connection string format
3. 3.
   Build Issues
   
   - Clear node_modules and reinstall dependencies
   - Check for conflicting port usage
   - Verify all environment variables are set