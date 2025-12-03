// components/ChatInterface.jsx
import { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import MessageArea from './MessageArea';
import CreateChannelModal from './CreateChannelModal';
import ChannelInfoPanel from './ChannelInfoPanel';

function ChatInterface({ user, socket, onLogout, apiUrl, token }) {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch channels
  useEffect(() => {
    fetchChannels();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages in real-time
    socket.on('new-message', (message) => {
      console.log('New message received:', message);
      if (message.channel === selectedChannel?._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    // Listen for online users list - when YOU connect
    socket.on('online-users', (users) => {
      console.log('Received initial online users list:', users);
      setOnlineUsers(users);
    });

    // User came online - when OTHERS connect
    socket.on('user-online', ({ userId }) => {
      console.log('User came online (broadcast):', userId);
      setOnlineUsers(prev => {
        if (!prev.includes(userId)) {
          const updated = [...prev, userId];
          console.log('Updated online users:', updated);
          return updated;
        }
        return prev;
      });
    });

    // User went offline
    socket.on('user-offline', ({ userId }) => {
      console.log('User went offline (broadcast):', userId);
      setOnlineUsers(prev => {
        const updated = prev.filter(id => id !== userId);
        console.log('Updated online users:', updated);
        return updated;
      });
    });

    // Debug: Log when socket connects
    socket.on('connect', () => {
      console.log('Socket connected! Socket ID:', socket.id);
    });

    // Debug: Log when socket disconnects
    socket.on('disconnect', () => {
      console.log('Socket disconnected!');
    });

    return () => {
      socket.off('new-message');
      socket.off('online-users');
      socket.off('user-online');
      socket.off('user-offline');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, selectedChannel]);

  const fetchChannels = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setChannels(data);
      
      if (data.length > 0 && !selectedChannel) {
        handleChannelSelect(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleChannelSelect = async (channel) => {
    if (selectedChannel) {
      socket.emit('leave-channel', selectedChannel._id);
    }

    setSelectedChannel(channel);
    setCurrentPage(1);
    setShowInfoPanel(false);
    
    socket.emit('join-channel', channel._id);
    
    await fetchMessages(channel._id, 1);
    await fetchChannelDetails(channel._id);
  };

  const fetchChannelDetails = async (channelId) => {
    try {
      const response = await fetch(`${apiUrl}/api/channels/${channelId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setChannelDetails(data);
    } catch (error) {
      console.error('Failed to fetch channel details:', error);
    }
  };

  const fetchMessages = async (channelId, page = 1) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/channels/${channelId}/messages?page=${page}&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      
      setHasMore(data.hasMore);
      setCurrentPage(page);
      setLoadingMore(false);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchMessages(selectedChannel._id, currentPage + 1);
    }
  };

  const handleSendMessage = (content) => {
    if (!content.trim() || !selectedChannel) return;

    socket.emit('send-message', {
      content: content.trim(),
      channelId: selectedChannel._id
    });
  };

  const handleCreateChannel = async (channelData) => {
    try {
      const response = await fetch(`${apiUrl}/api/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(channelData)
      });

      if (response.ok) {
        const newChannel = await response.json();
        setChannels(prev => [...prev, newChannel]);
        setShowCreateModal(false);
        handleChannelSelect(newChannel);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">💬 TeamChat</h1>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white text-sm"
              title="Logout"
            >
              🚪
            </button>
          </div>
          <div className="text-sm text-gray-400">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {user.username}
          </div>
        </div>

        <ChannelList
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleChannelSelect}
          onCreateChannel={() => setShowCreateModal(true)}
          onlineUsers={onlineUsers}
          currentUserId={user.id}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showInfoPanel ? 'mr-80' : ''}`}>
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center">
                  # {selectedChannel.name}
                  <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="ml-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded p-1 transition"
                    title="Channel Info"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                      <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </h2>
                {selectedChannel.description && (
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedChannel.description}
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-400">
                {onlineUsers.length} online
              </div>
            </div>

            {/* Messages */}
            <MessageArea
              messages={messages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onLoadMore={loadMoreMessages}
              hasMore={hasMore}
              loadingMore={loadingMore}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">👋 Welcome to TeamChat!</p>
              <p>Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Channel Info Panel */}
      {showInfoPanel && channelDetails && (
        <ChannelInfoPanel
          channel={channelDetails}
          onlineUsers={onlineUsers}
          allUsers={channelDetails.members}
          currentUserId={user.id}
          onClose={() => setShowInfoPanel(false)}
        />
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChannel}
        />
      )}
    </div>
  );
}

export default ChatInterface;