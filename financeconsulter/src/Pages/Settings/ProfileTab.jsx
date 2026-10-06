import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { API_URL } from '../../services/api';

export default function ProfileTab({ user, onUserUpdated, onSuccess, onError, isMobile }) {
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    name: user?.name || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const handleProfileChange = (field) => (event) => {
    setProfileData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/user/${user.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;

        if (Array.isArray(detail)) {
          const msg = detail
            .map((d) => d?.msg)
            .filter(Boolean)
            .join(', ');
          throw new Error(msg || 'Failed to update profile');
        }

        throw new Error(detail || 'Failed to update profile');
      }

      // Re-fetch current user (token stays valid after an email change: JWT subject is the user id)
      const token = localStorage.getItem('authToken');
      const meRes = await fetch(`${API_URL}/user/me`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!meRes.ok) {
        throw new Error('Profile update succeeded, but failed to reload user');
      }

      const updatedUser = await meRes.json();
      if (typeof onUserUpdated === 'function') {
        onUserUpdated(updatedUser);
      }

      window.dispatchEvent(new Event('fc:user-updated'));
      onSuccess('Profile updated successfully!');
    } catch (err) {
      onError(err.message);
    }
  };

  const handleCancel = () => {
    setProfileData({
      email: user?.email || '',
      name: user?.name || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Profile Information
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update your personal details
        </Typography>
      </Box>

      <Divider />

      <TextField
        label="Email"
        value={profileData.email}
        onChange={handleProfileChange('email')}
        fullWidth
        type="email"
        helperText="Your email address for login"
      />

      <TextField
        label="Display Name"
        value={profileData.name}
        onChange={handleProfileChange('name')}
        fullWidth
        helperText="This is how you'll appear in the system"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="First Name"
          value={profileData.first_name}
          onChange={handleProfileChange('first_name')}
          fullWidth
        />
        <TextField
          label="Last Name"
          value={profileData.last_name}
          onChange={handleProfileChange('last_name')}
          fullWidth
        />
      </Stack>

      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
        <Button variant="outlined" onClick={handleCancel} fullWidth={isMobile}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSaveProfile} fullWidth={isMobile}>
          Save Changes
        </Button>
      </Box>
    </Stack>
  );
}
