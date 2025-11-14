import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
} from '@mui/material';

export default function SecurityTab({ user, onSuccess, onError, isMobile }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      onError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/user/${user.id}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      onSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      onError(err.message);
    }
  };

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update your password to keep your account secure
        </Typography>
      </Box>

      <Divider />

      <TextField
        label="Current Password"
        type="password"
        value={passwordData.currentPassword}
        onChange={handlePasswordChange('currentPassword')}
        fullWidth
        autoComplete="current-password"
      />

      <TextField
        label="New Password"
        type="password"
        value={passwordData.newPassword}
        onChange={handlePasswordChange('newPassword')}
        fullWidth
        autoComplete="new-password"
        helperText="Must be at least 8 characters"
      />

      <TextField
        label="Confirm New Password"
        type="password"
        value={passwordData.confirmPassword}
        onChange={handlePasswordChange('confirmPassword')}
        fullWidth
        autoComplete="new-password"
      />

      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
        <Button variant="outlined" onClick={handleCancel} fullWidth={isMobile}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleChangePassword} fullWidth={isMobile}>
          Change Password
        </Button>
      </Box>
    </Stack>
  );
}
