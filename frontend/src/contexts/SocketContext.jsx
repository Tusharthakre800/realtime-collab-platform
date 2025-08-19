import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // const newSocket = io('http://localhost:5000', {
      const newSocket = io(`${import.meta.env.VITE_API_BASE}`, {
        withCredentials: true,  
        transports: ['websocket', 'polling'],
      });
      console.log('Socket connected:', newSocket.id);

      setSocket(newSocket);
      newSocket.emit('user-online', user.id);
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};