import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const ChatBox = ({ messages, onSendMessage, isTyping }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageRefs = useRef([]);

  useEffect(() => {
    gsap.fromTo(chatContainerRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const newMessageRef = messageRefs.current[messages.length - 1];
      if (newMessageRef) {
        gsap.fromTo(newMessageRef,
          { opacity: 0, x: -20, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );
      }
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      
      gsap.to('.send-btn', {
        scale: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }
  };

  return (
    <div ref={chatContainerRef} className="h-full flex flex-col bg-[#f8fafc] rounded-lg">
      <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-t-lg text-white px-4 py-3 shadow-sm">
        <h3 className="text-lg font-semibold">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f1f5f9]">
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            ref={el => messageRefs.current[index] = el}
            className={`flex ${message.isSent ? 'justify-end' : 'justify-start'} mb-3`}
          >
            <div className={`max-w-[75%] ${message.isSent ? 'ml-auto' : 'mr-auto'}`}>
              {!message.isSent && (
                <div className="flex items-center space-x-2 mb-1 ml-1">
                  <span className="font-medium text-xs text-[#4c51bf]">{message.sender}</span>
                  <span className="text-xs text-[#64748b]">{message.timestamp}</span>
                </div>
              )}
              <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                message.isSent 
                  ? 'bg-gradient-to-r from-[#667eea] to-[#f093fb] text-white rounded-br-md' 
                  : 'bg-white text-gray-800 border border-[#e2e8f0] rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed break-words">{message.text}</p>
                {message.isSent && (
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-75">{message.timestamp}</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="text-sm text-[#64748b] italic flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
            <span>Partner is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#e2e8f0] bg-white p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-[#e2e8f0] rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#667eea] focus:border-transparent transition-all text-sm"
          />
          <button
            type="submit"
            className="send-btn bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-6 py-2 rounded-xl hover:from-[#5a6fd8] hover:to-[#6a4190] transition-all duration-200 shadow-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;