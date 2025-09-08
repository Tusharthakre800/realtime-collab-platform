import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      console.log('Creating socket connection for user:', user.id || user._id);
      
      const newSocket = io(`${import.meta.env.VITE_API_BASE}`, {
        withCredentials: true,
        transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        // Remove forceNew: true to prevent connection resets
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected successfully:', newSocket.id);
        const userId = user.id || user._id;
        newSocket.emit('user-online', userId);
        
        localStorage.setItem('userId', userId.toString());
        localStorage.setItem('userName', user.name || user.username || 'Unknown User');
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          newSocket.connect();
        }
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        // Fallback to polling if websocket fails
        if (newSocket.io.opts.transports.includes('websocket')) {
          console.log('Falling back to polling transport');
          newSocket.io.opts.transports = ['polling'];
        }
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        newSocket.emit('user-online', user.id || user._id);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after maximum attempts');
      });

      setSocket(newSocket);
      
      return () => {
        console.log('Cleaning up socket connection');
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user, loading]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};