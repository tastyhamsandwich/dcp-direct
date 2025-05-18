'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@contexts/authContext';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import './settings.modules.css';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [theme, setTheme] = useState('light');
  const [timezone, setTimezone] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{
    id: string;
    user_id: string;
    card_type: string;
    last_four: string;
    expiry_month: string;
    expiry_year: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
    
  // Load user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.username || '');
      setEmail(user.email || '');
      
      // Fetch additional user data
      const fetchUserData = async () => {
        try {
          // TODO Replace with actual user data fetching logic using MongoDB
          
          const data: any = await fetch(`dummydata`); // TODO Replace with actual API call
          
          if (data) {
            setFirstName(data.first_name || '');
            setLastName(data.last_name || '');
            setAddress(data.address || '');
            
            // Set and apply theme
            const currentTheme = data.theme || 'light';
            setTheme(currentTheme);
            document.documentElement.setAttribute('data-theme', currentTheme);
            
            setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
          }
          
          // Fetch payment methods
          // TODO Replace with actual payment method fetching logic using MongoDB
          
          const paymentData: any = await fetch(`dummydata`); // TODO Replace with actual API call
          
          if (paymentData) {
            setPaymentMethods(paymentData);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      };
      
      fetchUserData();
    }
  }, [user]);
  
  // Update display name
  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      await updateProfile({ username: displayName });
      setMessage('Display name updated successfully');
    } catch (err) {
      setError('Failed to update display name');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Update email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // TODO Replace with actual email update logic using MongoDB
      
      if (error) {
        throw error;
      }
      
      setMessage('Email update confirmation sent to your email address');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetPasswordSuccess(false);
    setError('');
    
    try {
      // TODO Replace with actual password reset logic using MongoDB
      
      if (error) {
        throw error;
      }
      
      setResetPasswordSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Update personal info
  const handleUpdatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // TODO Replace with actual personal info update logic using MongoDB
        
      if (error) {
        throw error;
      }
      
      setMessage('Personal information updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update personal information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle theme
  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    try {
      // TODO Replace with actual theme update logic using MongoDB
        
      if (error) {
        throw error;
      }
      
      // Apply theme to document using data-theme attribute
      document.documentElement.setAttribute('data-theme', newTheme);
      
    } catch (err) {
      console.error('Failed to update theme preference:', err);
    }
  };
  
  // Update timezone
  const handleUpdateTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // TODO Replace with actual timezone update logic using MongoDB

      if (error) {
        throw error;
      }
      
      setMessage('Timezone updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update timezone');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset statistics
  const handleResetStats = async () => {
    if (!window.confirm('Are you sure you want to reset your statistics? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // TODO Replace with actual statistics reset logic using MongoDB
        
      if (error) {
        throw error;
      }
      
      setMessage('Statistics reset successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Remove payment method
  const handleRemovePaymentMethod = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }
    
    try {
      // TODO Replace with actual payment method removal logic using MongoDB
        
      if (error) {
        throw error;
      }
      
      // Update the UI
      setPaymentMethods(paymentMethods.filter(method => method.id !== id));
      setMessage('Payment method removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
      console.error(err);
    }
  };
  
  // Add payment method (mock - would connect to payment processor in production)
  const handleAddPaymentMethod = () => {
    alert('This would open a secure payment method form in a production environment.');
    // TODO Add logic to open a payment method form/modal and handle the response
  };
  
  if (!user) {
    return <div className="text-center p-8">Loading user data...</div>;
  }

  return (
    <div className="outer-container">
      <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
      
      {message && <div className="success-message mb-4">{message}</div>}
      {error && <div className="error-message mb-4">{error}</div>}
      
      <div className="settings-grid">
        {/* Profile Section */}
        <div className="settings-section">
          <h3 className="settings-heading">Profile Settings</h3>
          
          <form onSubmit={handleUpdateDisplayName} className="settings-form">
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Display Name'}
            </Button>
          </form>
          
          <form onSubmit={handleUpdateEmail} className="settings-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
          
          <div className="settings-form">
            <Button 
              variant="outline" 
              onClick={() => setShowResetPassword(!showResetPassword)}
            >
              Reset Password
            </Button>
            
            {showResetPassword && (
              <form onSubmit={handleResetPassword} className="mt-4">
                <p className="text-sm mb-2">
                  A password reset link will be sent to your email address.
                </p>
                {resetPasswordSuccess ? (
                  <div className="success-message">
                    Password reset email sent. Please check your inbox.
                  </div>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                )}
              </form>
            )}
          </div>
        </div>
        
        {/* Personal Information Section */}
        <div className="settings-section">
          <h3 className="settings-heading">Personal Information</h3>
          
          <form onSubmit={handleUpdatePersonalInfo} className="settings-form">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Personal Info'}
            </Button>
          </form>
        </div>
        
        {/* Preferences Section */}
        <div className="settings-section">
          <h3 className="settings-heading">Preferences</h3>
          
          <div className="settings-form">
            <div className="form-group">
              <label>Theme</label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </Button>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleUpdateTimezone} className="settings-form">
            <div className="form-group">
              <label htmlFor="timezone">Timezone</label>
              <select
                id="timezone"
                className="w-full p-2 border rounded"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (GMT -4)</option>
                <option value="America/Chicago">Central Time (GMT -5)</option>
                <option value="America/Denver">Mountain Time (GMT -6)</option>
                <option value="America/Los_Angeles">Pacific Time (GMT -7)</option>
                <option value="Europe/London">London (GMT +0)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Timezone'}
            </Button>
          </form>
        </div>
        
        {/* Payment Methods Section */}
        <div className="settings-section">
          <h3 className="settings-heading">Payment Methods</h3>
          
          <div className="payment-methods">
            {paymentMethods.length === 0 ? (
              <p>No payment methods added yet.</p>
            ) : (
              <ul className="payment-list">
                {paymentMethods.map((method) => (
                  <li key={method.id} className="payment-item">
                    <div className="payment-info">
                      <span>{method.card_type}</span>
                      <span>•••• •••• •••• {method.last_four}</span>
                      <span>Expires: {method.expiry_month}/{method.expiry_year}</span>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleAddPaymentMethod}
            >
              Add Payment Method
            </Button>
          </div>
        </div>
        
        {/* Game Statistics Section */}
        <div className="settings-section">
          <h3 className="settings-heading">Game Statistics</h3>
          
          <div className="settings-form">
            <p className="text-sm mb-4">
              Reset your game statistics. This will clear all your game history, wins, losses,
              and performance metrics. This action cannot be undone.
            </p>
            
            <Button
              variant="destructive"
              onClick={handleResetStats}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Statistics'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}