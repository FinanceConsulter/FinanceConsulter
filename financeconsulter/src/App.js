import logo from './logo.svg';
import './App.css';
import { Box, Drawer, List, ListItem, ListItemText } from '@mui/material';
import { useState } from 'react';
import Dashboard from './Dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      //case 'users': return <Users />;
      //case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer variant="permanent" sx={{
        width: 240,
        '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' }
      }}>
        <List>
          <ListItem button onClick={() => setCurrentPage('dashboard')}>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button onClick={() => setCurrentPage('users')}>
            <ListItemText primary="Users" />
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {renderPage()}
      </Box>
    </Box>
  );
}

export default App;
