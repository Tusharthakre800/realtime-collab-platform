import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const CollaborationRequest = ({ requestData, onClose, name }) => {
  const socket = useSocket();
  const { user } = useAuth();
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const buttonsRef = useRef([]);

  useEffect(() => {
    const tl = gsap.timeline();
    
    tl.fromTo(backdropRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 }
    ).fromTo(modalRef.current,
      { opacity: 0, scale: 0.8, y: -50 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
    ).fromTo(buttonsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.1 }
    );

    return () => {
      tl.kill();
    };
  }, []);

  const handleClose = () => {
    gsap.timeline()
      .to(modalRef.current, {
        opacity: 0,
        scale: 0.8,
        y: -50,
        duration: 0.3,
        ease: "power2.in"
      })
      .to(backdropRef.current, {
        opacity: 0,
        duration: 0.2
      })
      .call(onClose);
  };

  const handleAccept = () => {
    gsap.to(buttonsRef.current[0], {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (socket) {
          socket.emit('accept-collaboration', {
            senderId: requestData.senderId,
            receiverId: user.id,
            senderName: requestData.senderName
          });
        }
        handleClose();
      }
    });
  };

  const handleReject = () => {
    gsap.to(buttonsRef.current[1], {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (socket) {
          socket.emit('reject-collaboration', { 
            senderId: requestData.senderId,
            requestId: requestData.requestId
          });
        }
        handleClose();
      }
    });
  };

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50"
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        className="relative top-20 mx-auto p-6 border-0 w-96 shadow-2xl rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-black mb-4">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-black mb-2">
            Collaboration Request
          </h3>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-black">{name || 'Someone'}</span> has sent you a collaboration request.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click Accept to join their workspace or Reject to decline.
            </p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <button
              ref={el => buttonsRef.current[0] = el}
              onClick={handleAccept}
              className="px-6 py-3 bg-black text-white text-base font-semibold rounded-lg w-32 hover:bg-gray-800 transform hover:scale-105 transition-all duration-200"
            >
              Accept
            </button>
            <button
              ref={el => buttonsRef.current[1] = el}
              onClick={handleReject}
              className="px-6 py-3 bg-gray-200 text-gray-800 text-base font-semibold rounded-lg w-32 hover:bg-gray-300 transform hover:scale-105 transition-all duration-200"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationRequest;