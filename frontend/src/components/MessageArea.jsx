// components/MessageArea.jsx
import { useState, useEffect, useRef } from 'react';

function MessageArea({ messages, currentUser, onSendMessage, onLoadMore, hasMore, loadingMore }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is at the top
    if (container.scrollTop === 0 && hasMore && !loadingMore) {
      const previousHeight = container.scrollHeight;
      onLoadMore();
      
      // Maintain scroll position after loading more messages
      setTimeout(() => {
        container.scrollTop = container.scrollHeight - previousHeight;
      }, 100);
    }

    // Check if user is near bottom
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
      setShouldScrollToBottom(true);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loadingMore && (
          <div className="text-center py-2">
            <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {hasMore && !loadingMore && (
          <div className="text-center">
            <button
              onClick={onLoadMore}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.map((message, index) => {
          const isOwnMessage = message.sender._id === currentUser.id;
          const showUsername = 
            index === 0 || 
            messages[index - 1].sender._id !== message.sender._id;

          return (
            <div key={message._id} className="group">
              {showUsername && (
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className={`font-semibold text-sm ${
                    isOwnMessage ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {message.sender.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              )}
              
              <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg px-4 py-2 rounded-lg ${
                  isOwnMessage 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  <p className="text-sm break-words">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default MessageArea;