import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect, useCallback } from 'react';

function Header({ handleDrawerToggle }) {
  const [helloText, setHelloText] = useState('Hallo');

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setHelloText('Hallo');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/user/me', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load user');
      const data = await response.json();

      const displayName = data?.name?.trim();
      const fullName = [data?.first_name?.trim(), data?.last_name?.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
      const fallback = data?.email?.trim() || '';

      const greetingTarget = displayName || fullName || fallback;
      setHelloText(greetingTarget ? `Hello ${greetingTarget}` : 'Hello');
    } catch (error) {
      setHelloText('Hello');
      console.error('Failed to fetch current user:', error);
    }
  }, []);

  useEffect(() => {
    const onUserUpdated = () => {
      fetchUser();
    };

    const onFocus = () => {
      fetchUser();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };

    fetchUser();
    window.addEventListener('fc:user-updated', onUserUpdated);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Safety net: refresh periodically so the header stays up-to-date.
    const intervalId = setInterval(fetchUser, 30000);

    return () => {
      window.removeEventListener('fc:user-updated', onUserUpdated);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchUser]);


  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div">
          {helloText}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Header;