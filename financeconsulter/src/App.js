import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import Header from './Components/Header';
import NavBar from './Components/Navbar';
import TransactionTable from './Components/TransactionTable';
import Dashboard from './Dashboard';
import { fetchTransactions } from './services/api';

function App() {
  const [tableHeader, setTableHeader] = useState({ date: 'Date', amount: 'Amount', actions: 'Actions' });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTransactions()
      .then((res) => {
        if (!mounted) return;
        setTableHeader(res.header);
        setTableData(res.data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        if (loading) return <div>Loading…</div>;
        if (error) return <div>Failed to load</div>;
        return <TransactionTable TableHeader={tableHeader} TableData={tableData} />;
      case 'settings':
        return <div>Settings Page</div>;
      default:
        return <Dashboard />;
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
          width: { xs: '100%', md: `calc(100% - 240px)` }
        }}
      >
        <Toolbar /> {/* header */}
        {renderPage()}
      </Box>
    </Box>
  );
}

export default App;