import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { gsap } from 'gsap';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatBox from '../components/ChatBox';

const Collaboration = () => {
  const { roomId } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [activeView, setActiveView] = useState('drawing');



  const headerRef = useRef(null);
  const chatRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem(`messages-${roomId}`);
    if (savedMessages) setMessages(JSON.parse(savedMessages));

    const masterTl = gsap.timeline();
    masterTl.fromTo(headerRef.current, { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.6 })
           .fromTo([chatRef.current, canvasRef.current], { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5 });

    if (socket) {
      socket.emit('join-room', roomId);
      socket.on('chat-message', (message) => {
        setMessages(prev => {
          const newMessages = [...prev, message];
          localStorage.setItem(`messages-${roomId}`, JSON.stringify(newMessages));
          return newMessages;
        });
      });
      socket.on('session-ended', () => {
        localStorage.removeItem(`messages-${roomId}`);
        navigate('/', { replace: true });
      });
    }

    return () => {
      socket?.off('chat-message');
      socket?.off('session-ended');
    };
  }, [socket, roomId, navigate]);

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

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] ">
      {/* Header */}
      <header ref={headerRef} className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 md:py-3 lg:mt-10 ">
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

          <button
            onClick={handleEndSession}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            End Session
          </button>
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

      {/* Main Content Grid */}
      <div className="grid lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-0">
        {/* Drawing Area */}
        <div 
          ref={canvasRef}
          className={`${activeView === 'drawing' ? 'flex' : 'hidden'} lg:flex flex-col overflow-hidden bg-white h-[calc(95vh-120px)] lg:h-[calc(105vh-150px)] lg:mt-11 rounded-lg `}
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
          className={`${activeView === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col  rounded-lg bg-[#e4e1dd] h-[calc(80vh-100px)]  lg:h-[calc(100vh-130px)] mt-15   `}

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