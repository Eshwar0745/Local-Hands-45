/**
 * Real-Time Chat Socket for Active Bookings
 * - Messages stored ONLY in memory (not in database)
 * - Chat room auto-deleted when booking completes
 * - Uber/Ola style instant messaging
 */

// In-memory storage: { bookingId: [messages] }
const activeChats = new Map();

// Connected users: { userId: { socketId, bookingId } }
const connectedUsers = new Map();

export const initializeChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // User joins chat room for a specific booking
    socket.on('join-booking-chat', ({ bookingId, userId, userName, userRole }) => {
      socket.join(`booking-${bookingId}`);
      
      connectedUsers.set(userId, {
        socketId: socket.id,
        bookingId,
        userName,
        userRole
      });

      console.log(`👤 ${userName} (${userRole}) joined chat for booking ${bookingId}`);

      // Send existing messages to newly joined user
      const existingMessages = activeChats.get(bookingId) || [];
      socket.emit('chat-history', existingMessages);

      // Notify other user that someone joined
      socket.to(`booking-${bookingId}`).emit('user-joined', {
        userName,
        userRole,
        timestamp: new Date()
      });

      // Send online status
      const roomUsers = Array.from(connectedUsers.values())
        .filter(u => u.bookingId === bookingId);
      
      io.to(`booking-${bookingId}`).emit('online-users', {
        count: roomUsers.length,
        users: roomUsers.map(u => ({ userName: u.userName, userRole: u.userRole }))
      });
    });

    // Send message
    socket.on('send-message', ({ bookingId, message, senderId, senderName, senderRole }) => {
      const messageData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bookingId,
        senderId,
        senderName,
        senderRole,
        message: message.trim(),
        timestamp: new Date(),
        read: false
      };

      // Store in memory
      if (!activeChats.has(bookingId)) {
        activeChats.set(bookingId, []);
      }
      activeChats.get(bookingId).push(messageData);

      // Broadcast to all users in the booking room
      io.to(`booking-${bookingId}`).emit('new-message', messageData);

      console.log(`💬 [${bookingId}] ${senderName}: ${message}`);
    });

    // Typing indicator
    socket.on('typing', ({ bookingId, userId, userName, userRole }) => {
      socket.to(`booking-${bookingId}`).emit('user-typing', { 
        userId, 
        userName, 
        userRole 
      });
    });

    socket.on('stop-typing', ({ bookingId, userId }) => {
      socket.to(`booking-${bookingId}`).emit('user-stop-typing', { userId });
    });

    // Mark messages as read
    socket.on('mark-as-read', ({ bookingId, userId }) => {
      const messages = activeChats.get(bookingId) || [];
      let unreadCount = 0;
      
      messages.forEach(msg => {
        if (msg.senderId !== userId && !msg.read) {
          msg.read = true;
          unreadCount++;
        }
      });

      if (unreadCount > 0) {
        socket.to(`booking-${bookingId}`).emit('messages-read', { 
          userId,
          count: unreadCount
        });
      }
    });

    // Get unread count
    socket.on('get-unread-count', ({ bookingId, userId }) => {
      const messages = activeChats.get(bookingId) || [];
      const unreadCount = messages.filter(msg => 
        msg.senderId !== userId && !msg.read
      ).length;

      socket.emit('unread-count', { bookingId, count: unreadCount });
    });

    // Clean up when booking completes (called by backend controller)
    socket.on('complete-booking', ({ bookingId }) => {
      console.log(`🧹 Cleaning up chat for booking ${bookingId}`);
      
      // Send notification before deleting
      io.to(`booking-${bookingId}`).emit('chat-closed', {
        message: 'Service completed. Chat has ended. Thank you!',
        timestamp: new Date()
      });

      // Delete chat history after 5 seconds (give time for notification)
      setTimeout(() => {
        activeChats.delete(bookingId);
        console.log(`✅ Chat data deleted for booking ${bookingId}`);
      }, 5000);
    });

    // Leave chat room
    socket.on('leave-booking-chat', ({ bookingId, userId, userName }) => {
      socket.leave(`booking-${bookingId}`);
      
      socket.to(`booking-${bookingId}`).emit('user-left', {
        userName,
        timestamp: new Date()
      });

      console.log(`👋 ${userName} left chat for booking ${bookingId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      
      // Find and remove user from connected users
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          const { bookingId, userName, userRole } = userData;
          
          connectedUsers.delete(userId);
          
          // Notify others in the room
          socket.to(`booking-${bookingId}`).emit('user-offline', {
            userName,
            userRole,
            timestamp: new Date()
          });

          // Update online users count
          const roomUsers = Array.from(connectedUsers.values())
            .filter(u => u.bookingId === bookingId);
          
          io.to(`booking-${bookingId}`).emit('online-users', {
            count: roomUsers.length,
            users: roomUsers.map(u => ({ userName: u.userName, userRole: u.userRole }))
          });
          
          break;
        }
      }
    });
  });

  console.log('✅ Chat Socket initialized');
};

// ✅ Admin functions to monitor active chats
export const getActiveChatRooms = () => {
  return Array.from(activeChats.keys());
};

export const getChatMessageCount = (bookingId) => {
  return activeChats.get(bookingId)?.length || 0;
};

export const getAllActiveChats = () => {
  const chats = [];
  for (const [bookingId, messages] of activeChats.entries()) {
    chats.push({
      bookingId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1],
      users: Array.from(connectedUsers.values())
        .filter(u => u.bookingId === bookingId)
        .map(u => u.userName)
    });
  }
  return chats;
};

export default { 
  initializeChatSocket, 
  getActiveChatRooms, 
  getChatMessageCount,
  getAllActiveChats 
};
