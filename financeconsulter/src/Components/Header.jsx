import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect } from 'react';

function Header({ handleDrawerToggle }) {
  const [helloText, setHelloText] = useState('Hallo');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setHelloText('Hallo');
          return;
        }

        const response = await fetch('http://127.0.0.1:8000/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to load user');
        const data = await response.json();

        const displayName =
          data?.first_name?.trim() ||
          data?.name?.trim() ||
          data?.email?.trim() ||
          '';

        setHelloText(displayName ? `Hallo ${displayName}` : 'Hallo');
      } catch (error) {
        setHelloText('Hallo');
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchData();
  }, []);


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