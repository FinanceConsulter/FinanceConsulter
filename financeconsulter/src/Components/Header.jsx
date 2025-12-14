import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useEffect } from 'react';

function Header({ handleDrawerToggle }) {
  const [helloText, setHelloText] = useState('Loading...');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setHelloText(data.message || 'FinanceConsulter');
      } catch (error) {
        setHelloText('Error loading data');
        console.error('Failed to fetch hello world:', error);
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