import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gsap } from 'gsap';
import axios from 'axios';
import CollaborationRequest from '../components/CollaborationRequest';

const Home = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingRequests, setPendingRequests] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [showRequest, setShowRequest] = useState(false);
  const [requestData, setRequestData] = useState(null);
  
  const navRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const masterTl = gsap.timeline();
    
    masterTl
      .fromTo(navRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );

    if (socket) {
      socket.emit('user-online', user.id);

      socket.on('user-status-changed', (data) => {
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u._id === data.userId ? { ...u, isOnline: data.status === 'online' } : u
          )
        );
      });

      socket.on('active-users', (activeUserIds) => {
        setUsers(prevUsers => 
          prevUsers.map(u => ({ ...u, isOnline: activeUserIds.includes(u._id) }))
        );
      });

      socket.on('collaboration-request', (data) => {
        setRequestData(data);
        setShowRequest(true);
      });

      socket.on('collaboration-accepted', ({ roomId }) => {
        navigate(`/collaboration/${roomId}`);
      });

      socket.on('collaboration-rejected', ({ requestId }) => {
        console.log('Request rejected:', requestId);
        setPendingRequests(prev => {
          const updated = { ...prev };
          const keysToDelete = Object.keys(updated).filter(key => 
            key === requestId || updated[key].receiverId === requestId
          );
          keysToDelete.forEach(key => delete updated[key]);
          return updated;
        });
        
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        notification.textContent = 'Your collaboration request was rejected';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      });

      socket.on('collaboration-cancelled', ({ receiverName }) => {
        setPendingRequests(prev => {
          const updated = { ...prev };
          delete updated[Object.keys(updated).find(key => 
            updated[key].receiverName === receiverName
          )];
          return updated;
        });
        
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        notification.textContent = `${receiverName} cancelled their collaboration request`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      });

      return () => {
        socket.off('user-status-changed');
        socket.off('active-users');
        socket.off('collaboration-request');
        socket.off('collaboration-accepted');
        socket.off('collaboration-rejected');
        socket.off('collaboration-cancelled');
      };
    }
  }, [socket, navigate, user.id]);

  const fetchUsers = async () => {
    try {
      // const response = await axios.get('http://localhost:5000/api/users');
      const response = await axios.get(`${import.meta.env.VITE_API_BASE}/api/users`);
      const usersWithStatus = response.data
        .filter(u => u._id !== user.id)
        .map(u => ({ ...u, isOnline: false }));
      setUsers(usersWithStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleCollaborate = (receiverId) => {
    if (socket && user) {
      const receiver = users.find(u => u._id === receiverId);
      const requestId = `${user.id}_${receiverId}_${Date.now()}`;
      
      socket.emit('send-collaboration-request', {
        senderId: user.id,
        senderName: user.name,
        receiverId,
        receiverName: receiver.name,
        requestId
      });

      setPendingRequests(prev => ({
        ...prev,
        [requestId]: {
          receiverId,
          receiverName: receiver.name,
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  const handleCancelRequest = (requestId) => {
    if (socket && pendingRequests[requestId]) {
      const request = pendingRequests[requestId];
      socket.emit('cancel-collaboration-request', {
        senderId: user.id,
        senderName: user.name,
        receiverId: request.receiverId,
        receiverName: request.receiverName
      });
      
      setPendingRequests(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    }
  };

  const handleLogout = () => {
    gsap.timeline()
      .to(navRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.3
      })
      .call(() => {
        logout();
        navigate('/login');
      });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav 
        ref={navRef}
        className="bg-white shadow-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-black">
                CollabSpace
              </h1>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-black focus:outline-none p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.name[0]}</span>
                </div>
                <span className="text-gray-700 font-medium text-sm sm:text-base">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 sm:px-4 sm:py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{user?.name[0]}</span>
                </div>
                <span className="text-gray-700 font-medium">{user?.name}</span>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors duration-200 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-black">
              Available Collaborators
            </h2>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-[calc(100vh-250px)]">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-black"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center h-[calc(100vh-250px)] flex items-center justify-center">
              <p className="text-gray-500 text-base sm:text-lg">No users found matching your search</p>
            </div>
          ) : (
            <div className="h-[calc(100vh-250px)] overflow-auto scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredUsers.map((user) => (
                  <div 
                    key={user._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-base sm:text-lg">{user.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-black truncate">{user.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                            user.isOnline
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <span className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full mr-1 sm:mr-2 ${user.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCollaborate(user._id)}
                      disabled={!user.isOnline || Object.values(pendingRequests).some(req => req.receiverId === user._id)}
                      className={`mt-3 sm:mt-4 w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        user.isOnline && !Object.values(pendingRequests).some(req => req.receiverId === user._id)
                          ? 'bg-black text-white hover:bg-gray-800 transform hover:scale-[1.02]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {Object.values(pendingRequests).some(req => req.receiverId === user._id) 
                        ? 'Request Pending' 
                        : user.isOnline 
                          ? 'Start Collaboration' 
                          : 'User Offline'
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showRequest && (
        <CollaborationRequest 
          name={requestData?.senderName}
          requestData={requestData}
          onClose={() => setShowRequest(false)}
        />
      )}
    </div>
  );
};

export default Home;