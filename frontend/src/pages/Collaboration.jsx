import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import axios from 'axios';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatBox from '../components/ChatBox';
import CollaborationRequest from '../components/CollaborationRequest';

const Collaboration = () => {
  const { roomId } = useParams();
  const socket = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [activeView, setActiveView] = useState('drawing');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userDetails, setUserDetails] = useState({});
  const [roomUsers, setRoomUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showInvitationRequest, setShowInvitationRequest] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  const headerRef = useRef(null);
  const chatRef = useRef(null);
  const canvasRef = useRef(null);

  // Split the useEffect to ensure socket is connected before joining room
  useEffect(() => {
    const savedMessages = localStorage.getItem(`messages-${roomId}`);
    if (savedMessages) setMessages(JSON.parse(savedMessages));
  
    const masterTl = gsap.timeline();
    masterTl.fromTo(headerRef.current, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.6 })
           .fromTo([chatRef.current, canvasRef.current], { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5 });
  }, [roomId]);
  
  // Enhanced useEffect for socket connection and room joining
  useEffect(() => {
    if (socket && socket.connected) {
      console.log('✅ Socket connected, joining room:', roomId);
      socket.emit('join-room', roomId);
      socket.emit('get-available-users');
      socket.emit('get-room-users', { roomId });
      socket.emit('get-active-users'); // Add this for real-time user status
    } else if (socket) {
      console.log('⏳ Waiting for socket connection...');
      const checkConnection = setInterval(() => {
        if (socket.connected) {
          console.log('✅ Socket now connected, joining room:', roomId);
          socket.emit('join-room', roomId);
          socket.emit('get-available-users');
          socket.emit('get-room-users', { roomId });
          socket.emit('get-active-users'); // Add this
          clearInterval(checkConnection);
        }
      }, 500);
      return () => clearInterval(checkConnection);
    }
  }, [socket, roomId]);

  // Separate useEffect for socket event listeners
  useEffect(() => {
    if (!socket) return;
  
    const handleChatMessage = (message) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        localStorage.setItem(`messages-${roomId}`, JSON.stringify(newMessages));
        return newMessages;
      });
    };
  
    const handleSessionEnded = () => {
      localStorage.removeItem(`messages-${roomId}`);
      navigate('/', { replace: true });
    };
  
    // Add all socket event listeners
    socket.on('chat-message', handleChatMessage);
    socket.on('session-ended', handleSessionEnded);
    socket.on('available-users', (users) => {
      setAvailableUsers(users);
      fetchUserDetails(users);
    });
    socket.on('active-users', setOnlineUsers);
    socket.on('room-users', setRoomUsers);
    socket.on('user-status-changed', ({ userId, status }) => {
      setOnlineUsers(prev => status === 'online' ? [...prev, userId] : prev.filter(id => id !== userId));
      
      // Also update available users when status changes
      if (status === 'online') {
        socket.emit('get-available-users');
      }
    });
    socket.on('user-joined-room', ({ userId }) => {
      setRoomUsers(prev => [...prev, userId]);
      socket.emit('get-available-users'); // Refresh available users
    });
    socket.on('user-left-room', ({ userId }) => {
      setRoomUsers(prev => prev.filter(id => id !== userId));
      socket.emit('get-available-users'); // Refresh available users
    });
  
    return () => {
      socket.off('chat-message', handleChatMessage);
      socket.off('session-ended', handleSessionEnded);
      socket.off('available-users');
      socket.off('active-users');
      socket.off('room-users');
      socket.off('user-status-changed');
      socket.off('user-joined-room');
      socket.off('user-left-room');
    };
  }, [socket, roomId, navigate]);

  // Add periodic refresh for real-time updates
  useEffect(() => {
    if (!socket) return;

    const refreshInterval = setInterval(() => {
      socket.emit('get-active-users');
      socket.emit('get-available-users');
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [socket]);

  const fetchUserDetails = async (userIds) => {
    try {
      const response = await axios.post('/api/users/details', { userIds });
      const details = {};
      response.data.forEach(user => {
        details[user._id] = user;
      });
      setUserDetails(details);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleSendMessage = (text) => {
    if (!socket || !text.trim()) return;
    const message = {
      id: Date.now(),
      text,
      sender: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSent: true
    };
    setMessages(prev => [...prev, message]);
    socket.emit('chat-message', { roomId, message });
  };

  const handleEndSession = () => {
    if (!socket) return;
    gsap.timeline()
      .to([headerRef.current, chatRef.current, canvasRef.current], { opacity: 0, scale: 0.95, duration: 0.3 })
      .call(() => {
        socket.emit('end-session', { roomId });
        navigate('/');
      });
  };

  // handleInviteUser function को clean करें
  const handleInviteUser = (userId) => {
    if (!socket) return;
    const currentUserId = localStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userName') || user?.name || 'Unknown User';
    
    // Validation: खुद को invite नहीं कर सकते
    if (userId.toString() === currentUserId.toString()) {
      alert('आप खुद को invite नहीं कर सकते!');
      return;
    }
    
    console.log('Inviting user:', userId);
    console.log('Current user ID:', currentUserId);
    console.log('Socket connected:', socket.connected);
    
    socket.emit('invite-user-to-room', {
      roomId,
      userId,
      inviterId: currentUserId,
      inviterName: currentUserName
    });
    
    // Temporary test code को हटा दें - यह sender को popup दिखा रहा था
    // setTimeout(() => {
    //   console.log('Testing popup display...');
    //   setInvitationData({
    //     roomId,
    //     inviterId: currentUserId,
    //     inviterName: currentUserName,
    //     invitationId: Date.now().toString()
    //   });
    //   setShowInvitationRequest(true);
    // }, 2000);
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Add new socket listener for rejection notifications
  useEffect(() => {
    if (!socket) return;
  
    const handleInvitationRejected = ({ message, userId }) => {
      const rejectedUser = userDetails[userId];
      const userName = rejectedUser?.name || 'User';
      alert(`${userName} rejected your room invitation`);
    };
  
    socket.on('invitation-rejected', handleInvitationRejected);
  
    return () => {
      socket.off('invitation-rejected', handleInvitationRejected);
    };
  }, [socket, userDetails]);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr]">
      {/* Header */}
      <header ref={headerRef} className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 md:py-3 lg:mt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Collab Room</h1>
              <p className="text-xs text-gray-500">{roomId?.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              Add User
            </button>
            <button
              onClick={handleEndSession}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-pink-600 hover:to-rose-600 transition-all"
            >
              End Session
            </button>
          </div>
        </div>

        <div className="lg:hidden mt-3 flex space-x-2">
          <button
            onClick={() => setActiveView('drawing')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeView === 'drawing'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Drawing
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeView === 'chat'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Chat ({messages.length})
          </button>
        </div>
      </header>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Users to Room</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableUsers
                .filter(userId => {
                  const user = userDetails[userId];
                  return user && onlineUsers.includes(userId) && !roomUsers.includes(userId);
                })
                .map(userId => {
                  const user = userDetails[userId];
                  
                  return (
                    <div key={userId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-green-600 font-medium">Online</span>
                        <button
                          onClick={() => handleInviteUser(userId)}
                          className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600 transition-colors"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  );
                })}
              
              {availableUsers.filter(userId => {
                const user = userDetails[userId];
                return user && onlineUsers.includes(userId) && !roomUsers.includes(userId);
              }).length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No online users available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Invitation Popup */}
      {showInvitationRequest && (
        <CollaborationRequest
          name={invitationData?.inviterName}
          requestData={invitationData}
          onClose={() => setShowInvitationRequest(false)}
          type="room-invitation"
        />
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-0">
        {/* Drawing Area */}
        <div 
          ref={canvasRef}
          className={`${activeView === 'drawing' ? 'flex' : 'hidden'} lg:flex flex-col overflow-hidden bg-white h-[calc(95vh-120px)] lg:h-[calc(105vh-150px)] lg:mt-11 rounded-lg`}
        >
          <div className="flex-1 p-2 lg:p-4">
            <div className="w-full h-full bg-white rounded-lg shadow-inner border border-gray-200">
              <DrawingCanvas 
                roomId={roomId} 
                socket={socket} 
              />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={chatRef}
          className={`${activeView === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col rounded-lg bg-[#e4e1dd] h-[calc(80vh-100px)] lg:h-[calc(100vh-130px)] mt-15`}
        >
          <ChatBox 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isTyping={false} 
          />
        </div>
      </div>
    </div>
  );
};

export default Collaboration;
