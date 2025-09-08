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
    origin: process.env.VITE_API_URL,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"]
  }
});

app.use(cors({
  origin: process.env.VITE_API_URL,
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"]
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime-collab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000  
})

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const activeUsers = new Map();
const collaborationRooms = new Map();
const roomCanvasStates = {};
const roomMessages = new Map(); // Store messages per room

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-online', (userId) => {
    // Convert userId to string for consistency
    const userIdStr = userId.toString();
    activeUsers.set(userIdStr, socket.id);
    socket.userId = userIdStr;
    console.log('User online:', userIdStr, 'Socket:', socket.id);
    console.log('Active users:', Array.from(activeUsers.keys()));
    
    io.emit('user-status-changed', { userId: userIdStr, status: 'online' });
    socket.emit('active-users', Array.from(activeUsers.keys()));
  });

  socket.on('send-collaboration-request', ({ senderId, receiverId, senderName, receiverName, requestId }) => {
    try {
      if (!senderId || !receiverId) {
        console.error('Missing parameters in send-collaboration-request');
        return;
      }
      
      const receiverSocketId = activeUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('collaboration-request', {
          senderId: senderId.toString(),
          senderName: senderName || 'User',
          receiverId: receiverId.toString(),
          receiverName: receiverName || 'User',
          requestId: requestId || Date.now().toString()
        });
        console.log(`Collaboration request sent from ${senderId} to ${receiverId}`);
      }
    } catch (error) {
      console.error('Error in send-collaboration-request:', error);
    }
  });

  socket.on('accept-collaboration', ({ senderId, receiverId }) => {
    try {
      if (!senderId || !receiverId) {
        console.error('Missing parameters in accept-collaboration:', { senderId, receiverId });
        socket.emit('error', { message: 'Invalid collaboration data' });
        return;
      }
      
      // Find existing room or create new one
      let roomId = null;
      
      // Check if there's already a room with these users
      for (const [existingRoomId, users] of collaborationRooms.entries()) {
        const userSet = new Set(users);
        if (userSet.has(senderId.toString()) && !userSet.has(receiverId.toString())) {
          // Add receiver to existing room
          users.push(receiverId.toString());
          roomId = existingRoomId;
          break;
        }
      }
      
      // If no existing room found, create new one
      if (!roomId) {
        roomId = `room_${Date.now()}`;
        collaborationRooms.set(roomId, [senderId.toString(), receiverId.toString()]);
      }
      
      const senderSocketId = activeUsers.get(senderId.toString());
      const receiverSocketId = activeUsers.get(receiverId.toString());
      
      // Join both users to the room
      if (senderSocketId) {
        const senderSocket = io.sockets.sockets.get(senderSocketId);
        if (senderSocket) senderSocket.join(roomId);
      }
      
      socket.join(roomId);
      
      // Notify both users
      if (senderSocketId) {
        io.to(senderSocketId).emit('collaboration-accepted', { roomId });
      }
      socket.emit('collaboration-accepted', { roomId });
      
      // Notify room members about new user
      io.to(roomId).emit('user-joined-room', { 
        userId: receiverId.toString(),
        message: 'New user joined the collaboration'
      });
      
      console.log(`Users ${senderId} and ${receiverId} added to room ${roomId}`);
      
    } catch (error) {
      console.error('Error in accept-collaboration:', error);
      socket.emit('error', { message: 'Failed to accept collaboration' });
    }
  });

  socket.on('reject-collaboration', ({ senderId, requestId }) => {
    try {
      if (!senderId || !requestId) {
        console.error('Missing parameters in reject-collaboration:', { senderId, requestId });
        return;
      }
      
      const senderSocketId = activeUsers.get(senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('collaboration-rejected', {
          message: 'Request rejected',
          requestId: requestId
        });
      }
    } catch (error) {
      console.error('Error in reject-collaboration:', error);
    }
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
    
    // Send existing messages to the new user
    const messages = roomMessages.get(roomId) || [];
    socket.emit('sync-messages', messages);
    
    // Auto-sync all users from collaborationRooms to socket room
    const roomUsers = collaborationRooms.get(roomId) || [];
    console.log(`Current room ${roomId} users:`, roomUsers);
    
    // Verify all users are in socket room
    roomUsers.forEach(userId => {
      const userSocketId = activeUsers.get(userId.toString());
      if (userSocketId && io.sockets.sockets.has(userSocketId)) {
        const userSocket = io.sockets.sockets.get(userSocketId);
        if (userSocket && !userSocket.rooms.has(roomId)) {
          userSocket.join(roomId);
          console.log(`Auto-joined user ${userId} to room ${roomId}`);
        }
      }
    });
  });

  socket.on('chat-message', ({ roomId, message }) => {
    // Store the message
    if (!roomMessages.has(roomId)) {
      roomMessages.set(roomId, []);
    }
    roomMessages.get(roomId).push(message);
    
    // Broadcast to all users in room (including sender)
    io.to(roomId).emit('chat-message', message);
  });

  socket.on('drawing-data', ({ roomId, data }) => {
    socket.to(roomId).emit('drawing-data', data);
  });

  // Remove this duplicate handler
  // socket.on('chat-message', ({ roomId, message }) => {
  //   socket.to(roomId).emit('chat-message', message);
  // });

  socket.on('end-session', ({ roomId }) => {
    socket.to(roomId).emit('session-ended');
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      activeUsers.delete(socket.userId);
      io.emit('user-status-changed', { userId: socket.userId, status: 'offline' });
      console.log('User offline:', socket.userId);
      console.log('Active users after disconnect:', Array.from(activeUsers.keys()));
    }
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

  socket.on('get-room-users', ({ roomId }) => {
    const roomUsers = collaborationRooms.get(roomId) || [];
    socket.emit('room-users', roomUsers);
  });

  // invite-user-to-room handler में
  socket.on('invite-user-to-room', ({ roomId, userId, inviterId, inviterName }) => {
    console.log('=== INVITATION DEBUG ===');
    console.log('Target userId:', userId);
    console.log('Inviter ID:', inviterId);
    console.log('Active users:', Array.from(activeUsers.keys()));
    
    const userSocketId = activeUsers.get(userId.toString());
    console.log('Target socket ID:', userSocketId);
    
    if (userSocketId) {
      io.to(userSocketId).emit('room-invitation', {
        roomId,
        inviterId,
        inviterName: inviterName || 'Unknown User',
        invitationId: Date.now().toString()
      });
      console.log('✅ Invitation sent to socket:', userSocketId);
    }
  });

  // FIXED: accept-room-invitation handler with proper error handling
  // Replace the existing accept-room-invitation handler (lines ~150-180) with:
  socket.on('accept-room-invitation', ({ roomId, userId, inviterId }) => {
    try {
      console.log('Invitation accepted:');
      console.log('- Room ID:', roomId);
      console.log('- User ID:', userId);
      console.log('- Inviter ID:', inviterId);
      
      // Validate parameters
      if (!roomId || !userId || !inviterId) {
        console.error('Missing required parameters in accept-room-invitation');
        socket.emit('error', { message: 'Invalid invitation data' });
        return;
      }
      
      const userIdStr = userId.toString();
      const inviterIdStr = inviterId.toString();
      
      // Add user to room
      const roomUsers = collaborationRooms.get(roomId) || [];
      if (!roomUsers.includes(userIdStr)) {
        roomUsers.push(userIdStr);
        collaborationRooms.set(roomId, roomUsers);
      }
      
      // Join the socket room
      socket.join(roomId);
      
      // Notify the user to navigate to collaboration page
      const userSocketId = activeUsers.get(userIdStr);
      if (userSocketId && io.sockets.sockets.has(userSocketId)) {
        io.to(userSocketId).emit('invitation-accepted', { roomId });
      }
      
      // Notify inviter that invitation was accepted
      const inviterSocketId = activeUsers.get(inviterIdStr);
      if (inviterSocketId && io.sockets.sockets.has(inviterSocketId)) {
        io.to(inviterSocketId).emit('user-joined-room', { 
          userId: userIdStr,
          message: 'User joined the room'
        });
      }
      
      // Notify all room members about new user
      io.to(roomId).emit('user-joined-room', { userId: userIdStr });
      
      console.log(`User ${userIdStr} successfully added to room ${roomId}`);
      
    } catch (error) {
      console.error('Error in accept-room-invitation:', error);
      socket.emit('error', { message: 'Failed to accept invitation' });
    }
  });
  
  // Also fix the debug handler to prevent crashes:
  socket.on('debug-active-users', () => {
    try {
      console.log('=== DEBUG ACTIVE USERS ===');
      console.log('Total active users:', activeUsers.size);
      activeUsers.forEach((socketId, userId) => {
        const userSocket = io.sockets.sockets.get(socketId);
        console.log(`User: ${userId} -> Socket: ${socketId} -> Connected: ${userSocket?.connected || false}`);
      });
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error in debug-active-users:', error);
    }
  });
  
  // Enhanced cancel-room-invitation handler to send rejection notification
  socket.on('reject-room-invitation', ({ roomId, userId, inviterId }) => {
    console.log('Invitation rejected:');
    console.log('- Room ID:', roomId);
    console.log('- User ID:', userId);
    console.log('- Inviter ID:', inviterId);
    
    const inviterSocketId = activeUsers.get(inviterId.toString());
    if (inviterSocketId) {
      io.to(inviterSocketId).emit('invitation-rejected', {
        message: 'Request rejected',
        userId: userId.toString(),
        roomId: roomId
      });
    }
  });

  socket.on('get-available-users', () => {
    const currentUserId = socket.userId;
    const availableUsers = Array.from(activeUsers.keys()).filter(id => id !== currentUserId);
    socket.emit('available-users', availableUsers);
  });
  // Debug handler add करें
  socket.on('debug-active-users', () => {
    try {
      console.log('=== DEBUG ACTIVE USERS ===');
      console.log('Total active users:', activeUsers.size);
      activeUsers.forEach((socketId, userId) => {
        const userSocket = io.sockets.sockets.get(socketId);
        console.log(`User: ${userId} -> Socket: ${socketId} -> Connected: ${userSocket?.connected || false}`);
      });
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error in debug-active-users:', error);
    }
  });
  
  socket.on('debug-room-users', ({ roomId }) => {
    try {
      console.log('=== DEBUG ROOM USERS ===');
      console.log('Room ID:', roomId);
      
      // Get users from collaborationRooms
      const collaborationUsers = collaborationRooms.get(roomId) || [];
      console.log('Collaboration room users:', collaborationUsers);
      
      // Get actual socket room members
      const socketRoom = io.sockets.adapter.rooms.get(roomId);
      const socketUsers = socketRoom ? Array.from(socketRoom) : [];
      console.log('Socket room members:', socketUsers);
      
      // Map socket IDs to user IDs
      const userIdToSocketMap = new Map();
      activeUsers.forEach((socketId, userId) => {
        userIdToSocketMap.set(userId, socketId);
      });
      
      const detailedUsers = collaborationUsers.map(userId => ({
        userId,
        socketId: userIdToSocketMap.get(userId),
        isInSocketRoom: socketUsers.includes(userIdToSocketMap.get(userId)),
        isConnected: io.sockets.sockets.has(userIdToSocketMap.get(userId))
      }));
      
      console.log('Detailed user info:', detailedUsers);
      socket.emit('debug-room-info', { roomId, collaborationUsers, socketUsers, detailedUsers });
      
    } catch (error) {
      console.error('Error in debug-room-users:', error);
    }
  });
  
  socket.on('force-sync-room', ({ roomId }) => {
    try {
      console.log('=== FORCE SYNC ROOM ===');
      console.log('Room ID:', roomId);
      
      const roomUsers = collaborationRooms.get(roomId) || [];
      let syncedCount = 0;
      
      roomUsers.forEach(userId => {
        const userSocketId = activeUsers.get(userId.toString());
        if (userSocketId && io.sockets.sockets.has(userSocketId)) {
          const userSocket = io.sockets.sockets.get(userSocketId);
          if (userSocket && !userSocket.rooms.has(roomId)) {
            userSocket.join(roomId);
            syncedCount++;
            console.log(`Force-synced user ${userId} to room ${roomId}`);
          }
        }
      });
      
      console.log(`Synced ${syncedCount} users to room ${roomId}`);
      socket.emit('room-synced', { roomId, syncedCount });
      
    } catch (error) {
      console.error('Error in force-sync-room:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
