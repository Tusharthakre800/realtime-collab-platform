const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // origin: ["http://localhost:5173", "http://localhost:5174" , "*"],
    origin: process.env.VITE_API_URL,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"]
  }
});


app.use(cors(
  {
    origin: process.env.VITE_API_URL,
    // origin: ["http://localhost:5173", "http://localhost:5174" , "*"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"]
  }

));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime-collab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,  // retry faster
  socketTimeoutMS: 45000  
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('Error connecting to MongoDB:', err));

app.get('/', (req, res) => {
  res.send('Hello World!'); 
  console.log('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const activeUsers = new Map();
const collaborationRooms = new Map();

// Add these socket event handlers in your server.js

const roomCanvasStates = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-online', (userId) => {
    activeUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('user-status-changed', { userId, status: 'online' });
    // Send current active users list to newly connected client
    socket.emit('active-users', Array.from(activeUsers.keys()));
  });

  socket.on('send-collaboration-request', ({ senderId, receiverId }) => {
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('collaboration-request', {
        senderId,
        senderName: 'User Name', // You'll need to fetch actual name
        requestId: Date.now().toString()
      });
    }
  });

  socket.on('accept-collaboration', ({ senderId, receiverId }) => {
    const roomId = `room_${Date.now()}`;
    const senderSocketId = activeUsers.get(senderId);
    
    collaborationRooms.set(roomId, [senderId, receiverId]);
    
    if (senderSocketId) {
      io.to(senderSocketId).emit('collaboration-accepted', { roomId });
    }
    socket.join(roomId);
    socket.emit('collaboration-accepted', { roomId });
  });

  socket.on('reject-collaboration', ({ senderId, requestId }) => {
    const senderSocketId = activeUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('collaboration-rejected', {
        message: 'Request rejected',
        requestId: requestId
      });
    }
  });

  // ✅ ADD THIS MISSING HANDLER
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Drawing data broadcasting
  socket.on('drawing-data', ({ roomId, data }) => {
    socket.to(roomId).emit('drawing-data', data);
  });

//   socket.on('chat-message', ({ roomId, message }) => {
//     socket.to(roomId).emit('chat-message', message);
//   });

// Drawing data broadcasting
// socket.on('drawing-data', ({ roomId, data }) => {
//   socket.to(roomId).emit('drawing-data', data);
// });

// Chat message broadcasting
socket.on('chat-message', ({ roomId, message }) => {
  socket.to(roomId).emit('chat-message', message);
});

  socket.on('end-session', ({ roomId }) => {
    io.to(roomId).emit('session-ended');
    collaborationRooms.delete(roomId);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      io.emit('user-status-changed', { userId: socket.userId, status: 'offline' });
    }
    console.log('User disconnected:', socket.id);
  });

  socket.on('request-canvas-state', ({ roomId }) => {
    if (roomCanvasStates[roomId]) {
      socket.emit('canvas-state', { imageData: roomCanvasStates[roomId] });
    }
  });

  socket.on('save-canvas-state', ({ roomId, imageData }) => {
    roomCanvasStates[roomId] = imageData;
    socket.to(roomId).emit('canvas-state', { imageData });
  });

  socket.on('drawing-data', ({ roomId, data }) => {
    socket.to(roomId).emit('drawing-data', data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
