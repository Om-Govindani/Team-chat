// components/ChannelList.jsx
function ChannelList({ channels, selectedChannel, onSelectChannel, onCreateChannel }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">
            Channels
          </h3>
          <button
            onClick={onCreateChannel}
            className="text-gray-400 hover:text-white transition"
            title="Create Channel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {channels.map(channel => (
            <button
              key={channel._id}
              onClick={() => onSelectChannel(channel)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                selectedChannel?._id === channel._id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">#</span>
                <span className="truncate">{channel.name}</span>
              </div>
            </button>
          ))}
        </div>

        {channels.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-4">
            No channels yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}

export default ChannelList;