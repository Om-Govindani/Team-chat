// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ChannelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Channel = mongoose.model('Channel', ChannelSchema);
const Message = mongoose.model('Message', MessageSchema);

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Channel Routes
app.get('/api/channels', authMiddleware, async (req, res) => {
  try {
    const channels = await Channel.find()
      .populate('createdBy', 'username')
      .select('-members');
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const channel = new Channel({
      name,
      description,
      members: [req.userId],
      createdBy: req.userId
    });
    await channel.save();
    await channel.populate('createdBy', 'username');
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels/:channelId', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
      .populate('members', 'username')
      .populate('createdBy', 'username');
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels/:channelId/join', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel.members.includes(req.userId)) {
      channel.members.push(req.userId);
      await channel.save();
    }
    await channel.populate('members', 'username');
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels/:channelId/leave', authMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    channel.members = channel.members.filter(id => id.toString() !== req.userId);
    await channel.save();
    res.json({ message: 'Left channel successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Message Routes
app.get('/api/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({ channel: req.params.channelId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username');
    
    const total = await Message.countDocuments({ channel: req.params.channelId });
    
    res.json({
      messages: messages.reverse(),
      hasMore: skip + messages.length < total,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io for real-time features
const onlineUsers = new Map(); // userId -> Set of socketIds (for multiple tabs)

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Track online status (support multiple tabs)
  const isFirstConnection = !onlineUsers.has(socket.userId);
  
  if (isFirstConnection) {
    onlineUsers.set(socket.userId, new Set());
  }
  onlineUsers.get(socket.userId).add(socket.id);
  
  // Get current online user IDs
  const onlineUserIds = Array.from(onlineUsers.keys());
  console.log('Current online users:', onlineUserIds);
  
  // Send current online users to the newly connected user
  socket.emit('online-users', onlineUserIds);
  
  // Broadcast to ALL other users that this user came online (only if first connection)
  if (isFirstConnection) {
    socket.broadcast.emit('user-online', { userId: socket.userId });
    console.log('Broadcasting user online:', socket.userId);
  }
  
  // Join channel
  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.userId} joined channel ${channelId}`);
  });
  
  // Leave channel
  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
  });
  
  // Send message
  socket.on('send-message', async (data) => {
    try {
      const message = new Message({
        content: data.content,
        sender: socket.userId,
        channel: data.channelId
      });
      await message.save();
      await message.populate('sender', 'username');
      
      // Broadcast to ALL users in the channel (including sender)
      io.to(data.channelId).emit('new-message', message);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Typing indicator
  socket.on('typing-start', (channelId) => {
    socket.to(channelId).emit('user-typing', { userId: socket.userId });
  });
  
  socket.on('typing-stop', (channelId) => {
    socket.to(channelId).emit('user-stopped-typing', { userId: socket.userId });
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    const userSockets = onlineUsers.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      // Only mark user as offline if they have no more connections
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
        socket.broadcast.emit('user-offline', { userId: socket.userId });
        console.log('User went offline:', socket.userId);
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});