import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (token) {
      fetchItems();
    }
  }, [token]);

  useEffect(() => {
    setMessage('');
    setError('');
    setValidationErrors([]);
  }, [isRegistering]);

  useEffect(() => {
    if (isRegistering) {
      const errors = [];
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      setValidationErrors(errors);
    }
  }, [password, isRegistering]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (validationErrors.length > 0) {
      setError('Please fix password requirements');
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Registration successful! Please login.');
        setIsRegistering(false);
        setUsername('');
        setPassword('');
      } else {
        if (data.errors) {
          setError(Array.isArray(data.errors) 
            ? data.errors.map(e => e.msg || e).join(', ') 
            : data.errors);
        } else {
          setError(data.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setMessage('Login successful!');
        setUsername('');
        setPassword('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setItems([]);
    setMessage('');
    setError('');
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        throw new Error('Failed to fetch items');
      }
    } catch (err) {
      setError('Failed to fetch items');
    }
  };

  const createItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    
    try {
      const res = await fetch('http://localhost:3000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setNewItem({ name: '', description: '' });
        fetchItems();
        setMessage('Item created successfully!');
        setError('');
      } else {
        throw new Error('Failed to create item');
      }
    } catch (err) {
      setError('Failed to create item');
    }
  };

  const deleteItem = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/items/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchItems();
        setMessage('Item deleted successfully!');
        setError('');
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="w-full max-w-sm p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
          
          {message && (
            <div className="text-green-400 mb-4">
              {message}
            </div>
          )}
          {error && (
            <div className="text-red-400 mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={isRegistering ? handleRegister : handleLogin} 
                className="space-y-4">
            <div>
              <label className="block text-white mb-2">Username</label>
              <input
                type="text"
                placeholder="At least 3 characters"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[#2d2d2d] text-white border border-[#3d3d3d] rounded focus:outline-none focus:border-blue-500"
                minLength={3}
                required
              />
            </div>
            
            <div>
              <label className="block text-white mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2d2d2d] text-white border border-[#3d3d3d] rounded focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-[#2d2d2d] text-white rounded hover:bg-[#3d3d3d]"
              >
                {isRegistering ? 'Register' : 'Login'}
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-white hover:text-gray-300"
              >
                {isRegistering ? 'Back to Login' : 'Need an account?'}
              </button>
            </div>

            {isRegistering && validationErrors.length > 0 && (
              <div className="text-sm text-red-400">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Item Management</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-[#2d2d2d] text-white rounded hover:bg-[#3d3d3d]"
          >
            Logout
          </button>
        </div>

        {message && (
          <div className="text-green-400 mb-4">{message}</div>
        )}
        {error && (
          <div className="text-red-400 mb-4">{error}</div>
        )}

        <div className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Item Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="flex-1 px-3 py-2 bg-[#2d2d2d] text-white border border-[#3d3d3d] rounded focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="flex-1 px-3 py-2 bg-[#2d2d2d] text-white border border-[#3d3d3d] rounded focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={createItem}
            className="px-4 py-2 bg-[#2d2d2d] text-white rounded hover:bg-[#3d3d3d]"
          >
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-4 bg-[#2d2d2d] rounded"
            >
              <div>
                <h3 className="text-white font-bold">{item.name}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#3d3d3d]"
              >
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;