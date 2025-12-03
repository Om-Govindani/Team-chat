// components/ChannelInfoPanel.jsx
import { useState } from 'react';

function ChannelInfoPanel({ channel, onlineUsers, allUsers, currentUserId, onClose }) {
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Get online members with their details
  const onlineMembers = allUsers.filter(user => 
    onlineUsers.includes(user._id)
  );

  // Get offline members
  const offlineMembers = allUsers.filter(user => 
    !onlineUsers.includes(user._id)
  );

  const displayedOnlineMembers = showAllMembers 
    ? onlineMembers 
    : onlineMembers.slice(0, 8);

  const hasMoreOnlineMembers = onlineMembers.length > 8;

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col fixed right-0 top-0 h-screen animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Channel Info</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Channel Details */}
        <div>
          <h4 className="text-white font-semibold text-lg mb-2">
            # {channel.name}
          </h4>
          {channel.description && (
            <p className="text-gray-400 text-sm">{channel.description}</p>
          )}
          <div className="mt-3 text-xs text-gray-500">
            Created {new Date(channel.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Online Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-white font-medium flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Online ({onlineMembers.length})
            </h5>
          </div>
          
          <div className="space-y-2">
            {displayedOnlineMembers.map(member => (
              <div
                key={member._id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {member.username[0].toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {member.username}
                    {member._id === currentUserId && (
                      <span className="text-gray-500 ml-1">(you)</span>
                    )}
                  </p>
                </div>
              </div>
            ))}

            {hasMoreOnlineMembers && !showAllMembers && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="w-full text-left p-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded-lg transition"
              >
                Show all {onlineMembers.length} online members
              </button>
            )}

            {showAllMembers && hasMoreOnlineMembers && (
              <button
                onClick={() => setShowAllMembers(false)}
                className="w-full text-left p-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition"
              >
                Collapse list
              </button>
            )}
          </div>
        </div>

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <h5 className="text-white font-medium mb-3 flex items-center">
              <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
              Offline ({offlineMembers.length})
            </h5>
            
            <div className="space-y-2">
              {offlineMembers.map(member => (
                <div
                  key={member._id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-500 flex items-center justify-center text-white font-semibold text-sm">
                      {member.username[0].toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-500 rounded-full border-2 border-gray-800"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-sm truncate">
                      {member.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Members Count */}
        <div className="pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            <span className="font-medium text-white">{allUsers.length}</span> total member{allUsers.length !== 1 && 's'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelInfoPanel;