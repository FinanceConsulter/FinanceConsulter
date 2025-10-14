import { Box, Toolbar } from '@mui/material';
import { useEffect, useState } from 'react';
import Header from './Components/Header';
import NavBar from './Components/Navbar';
import Dashboard from './Pages/Dashboard';
import { fetchTransactions, registerUser } from './services/api';
import ReceiptCapture from './Pages/ReceiptCapture';
import Transactions from './Pages/Transactions';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Settings from './Pages/Settings';


function App() {
  const [tableHeader, setTableHeader] = useState({ date: 'Date', amount: 'Amount', actions: 'Actions' });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleRegister = async (payload) => {
    await registerUser(payload);
    setCurrentPage('login');
  };

  const handleLogin = () => {
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'login':
        return (
          <Login
            onSubmit={handleLogin}
            onNavigate={(page) => setCurrentPage(page)}
          />
        );
      case 'register':
        return (
          <Register
            onSubmit={handleRegister}
            onNavigate={(page) => setCurrentPage(page)}
          />
        );
      case 'transactions':
        if (loading) return <div>Loading…</div>;
        if (error) return <div>Failed to load</div>;
        return <Transactions header={tableHeader} data={tableData} setCurrentPage={setCurrentPage} />;
      case 'scanReceipts':
        return <ReceiptCapture />;
      case 'settings':
        return <Settings />;
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