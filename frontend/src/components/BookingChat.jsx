import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiX, FiMinimize2, FiMaximize2, FiPhone } from 'react-icons/fi';

export default function BookingChat({ booking, onClose, minimized: initialMinimized = false }) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [minimized, setMinimized] = useState(initialMinimized);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Determine other party details
  const otherParty = user.role === 'customer' 
    ? {
        name: booking.provider?.name || 'Provider',
        phone: booking.provider?.phone || booking.provider?.alternatePhone,
        role: 'provider'
      }
    : {
        name: booking.customer?.name || 'Customer',
        phone: booking.customer?.phone || booking.customer?.alternatePhone,
        role: 'customer'
      };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!minimized) {
      scrollToBottom();
    }
  }, [messages, minimized]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!minimized && socket && connected && messages.length > 0) {
      socket.emit('mark-as-read', {
        bookingId: booking._id,
        userId: user.id
      });
      setUnreadCount(0);
    }
  }, [minimized, messages.length, socket, connected, booking._id, user.id]);

  // Join chat room when component mounts
  useEffect(() => {
    if (!socket || !connected || !booking) return;

    console.log('📱 Joining chat room for booking:', booking._id);

    socket.emit('join-booking-chat', {
      bookingId: booking._id,
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });

    // Listen for chat history
    socket.on('chat-history', (history) => {
      console.log('📜 Received chat history:', history.length, 'messages');
      setMessages(history);
      
      // Count unread messages
      const unread = history.filter(msg => 
        msg.senderId !== user.id && !msg.read
      ).length;
      setUnreadCount(unread);
    });

    // Listen for new messages
    socket.on('new-message', (message) => {
      console.log('💬 New message:', message);
      setMessages(prev => [...prev, message]);
      
      // Increment unread count if minimized and message from other person
      if (minimized && message.senderId !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for typing
    socket.on('user-typing', ({ userName }) => {
      setTypingUser(userName);
    });

    socket.on('user-stop-typing', () => {
      setTypingUser(null);
    });

    // Listen for user joined
    socket.on('user-joined', ({ userName, userRole }) => {
      console.log(`👋 ${userName} (${userRole}) joined the chat`);
    });

    // Listen for chat closed
    socket.on('chat-closed', ({ message: msg }) => {
      alert(msg);
      onClose();
    });

    // Listen for messages read
    socket.on('messages-read', ({ userId }) => {
      if (userId !== user.id) {
        setMessages(prev => prev.map(msg => 
          msg.senderId === user.id ? { ...msg, read: true } : msg
        ));
      }
    });

    return () => {
      console.log('🧹 Leaving chat room');
      socket.emit('leave-booking-chat', {
        bookingId: booking._id,
        userId: user.id,
        userName: user.name
      });
      
      socket.off('chat-history');
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('user-joined');
      socket.off('chat-closed');
      socket.off('messages-read');
    };
  }, [socket, connected, booking, user, onClose, minimized]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !connected) return;

    socket.emit('send-message', {
      bookingId: booking._id,
      message: inputMessage.trim(),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role
    });

    setInputMessage('');
    handleStopTyping();
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleTyping = () => {
    if (!socket || !connected) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing', {
        bookingId: booking._id,
        userId: user.id,
        userName: user.name,
        userRole: user.role
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (socket && connected && typing) {
      socket.emit('stop-typing', {
        bookingId: booking._id,
        userId: user.id
      });
      setTyping(false);
    }
  };

  const handleCall = () => {
    if (otherParty.phone) {
      window.location.href = `tel:${otherParty.phone}`;
    } else {
      alert('Phone number not available');
    }
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
    if (minimized) {
      setUnreadCount(0);
      // Focus input when maximizing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  if (!connected) {
    return (
      <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 border border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600 dark:text-gray-400">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  // Minimized view
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-2xl cursor-pointer hover:shadow-blue-500/50 transition-all z-50"
           onClick={toggleMinimize}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
              {otherParty.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold">{otherParty.name}</h3>
              <p className="text-xs opacity-90">{booking.serviceTemplate?.name || booking.service?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
            <FiMaximize2 size={18} />
          </div>
        </div>
      </div>
    );
  }

  // Full chat view
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[550px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
            {otherParty.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">{otherParty.name}</h3>
            <p className="text-xs opacity-90">{booking.serviceTemplate?.name || booking.service?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Call Button */}
          {otherParty.phone && (
            <button
              onClick={handleCall}
              className="hover:bg-white/20 p-2 rounded-full transition-all hover:scale-110"
              title={`Call ${otherParty.name}`}
            >
              <FiPhone size={20} />
            </button>
          )}
          {/* Minimize Button */}
          <button
            onClick={toggleMinimize}
            className="hover:bg-white/20 p-2 rounded-full transition-all"
            title="Minimize"
          >
            <FiMinimize2 size={18} />
          </button>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-all"
            title="Close"
          >
            <FiX size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
              <FiSend className="text-blue-500 dark:text-blue-400" size={24} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No messages yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-200`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                  msg.senderId === user.id
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                <div className={`flex items-center gap-1 mt-1 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                  <p className={`text-xs ${msg.senderId === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.senderId === user.id && (
                    <span className="text-xs text-blue-100">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium">{typingUser}</span> is typing
            <span className="inline-flex gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
          </span>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/50"
          >
            <FiSend size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
