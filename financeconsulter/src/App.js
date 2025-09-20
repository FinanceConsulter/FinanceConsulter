import { Box, Toolbar, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import Header from './Components/Header';
import NavBar from './Components/Navbar';
import TransactionTable from './Components/TransactionTable';
import Dashboard from './Dashboard';

function App() {
  const TableHeader = {
    date: "Date",
    amount: "Amount"
  }
  const TableData = [
    {
      date: "20.09.2025",
      amount: "19.50",

    },
    {
      date: "21.09.2025",
      amount: "19.50",

    },
    {
      date: "22.09.2025",
      amount: "19.50",

    }
  ]

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'users': return <TransactionTable TableHeader={TableHeader} TableData={TableData} />;
      case 'settings': return <div>Settings Page</div>;
      default: return <Dashboard />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header handleDrawerToggle={handleDrawerToggle} />
      <NavBar
        setCurrentPage={setCurrentPage}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 240px)` }  // Responsive width
        }}
      >
        <Toolbar /> {/* Spacer for header */}
        {renderPage()}
      </Box>
    </Box>
  );
}

export default App;