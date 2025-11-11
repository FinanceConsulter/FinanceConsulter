import { Box, Toolbar } from '@mui/material';
import { useEffect, useState } from 'react';
import Header from './Components/Header';
import NavBar from './Components/Navbar';
import Dashboard from './Pages/Dashboard';
import { fetchTransactions} from './services/api';
import ReceiptCapture from './Pages/ReceiptCapture';
import Transactions from './Pages/Transactions';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Settings from './Pages/Settings';
import AIInsights from './Pages/AIInsights';


function App() {
  const [tableHeader, setTableHeader] = useState({ date: 'Date', amount: 'Amount', actions: 'Actions' });
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = currentPage === 'login' || currentPage === 'register';

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
    try {
        const response = await fetch('http://127.0.0.1:8000/user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
        }

        setCurrentPage('login');
    } catch (error) {
        throw error;
    }
  };

  const handleLogin = async (payload) => {
    try {
        const formData = new URLSearchParams();
        formData.append('username', payload.email);
        formData.append('password', payload.password);

        const response = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
        }

        const result = await response.json();
        localStorage.setItem('authToken', result.access_token);
        setCurrentPage('dashboard');
    } catch (error) {
        throw error;
    }
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
      case 'aiInsights':
        return <AIInsights />;
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