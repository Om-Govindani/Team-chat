// App.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AuthForm from './components/AuthForm';
import ChatInterface from './components/ChatInterface';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token and get user info
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Initialize socket connection with proper config
          const newSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'], // Try websocket first
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
          });

          // Debug socket connection
          newSocket.on('connect', () => {
            console.log('✅ Socket connected successfully!');
            console.log('Socket ID:', newSocket.id);
          });

          newSocket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
          });

          setSocket(newSocket);
        } else {
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const handleAuth = (authData) => {
    localStorage.setItem('token', authData.token);
    setToken(authData.token);
    setUser(authData.user);
    
    // Initialize socket
    const newSocket = io(API_URL, {
      auth: { token: authData.token }
    });
    setSocket(newSocket);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuth={handleAuth} apiUrl={API_URL} />;
  }

  return (
    <ChatInterface 
      user={user} 
      socket={socket} 
      onLogout={handleLogout}
      apiUrl={API_URL}
      token={token}
    />
  );
}

export default App;