import { Box, Toolbar } from '@mui/material';
import { useEffect, useState } from 'react';
import Header from './Components/Header';
import NavBar from './Components/Navbar';
import Dashboard from './Pages/Dashboard';
import ReceiptCapture from './Pages/ReceiptCapture';
import Transactions from './Pages/Transactions';
import Login from './Pages/Login';
import Register from './Pages/Register';
import Settings from './Pages/Settings';
import AIInsights from './Pages/AIInsights';
import QuickEntry from './Pages/QuickEntry';
import OnboardingCategories from './Pages/OnboardingCategories';


function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const ONBOARDING_PENDING_KEY = 'onboardingCategoriesPending';
  const ONBOARDING_DONE_KEY = 'hasCompletedOnboardingCategories';

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const safeReadJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  //Token Check
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
    if (!token) {
      setCurrentPage('login');
      setOnboardingRequired(false);
      return;
    }

    // Only show onboarding if it was triggered by registration and is still pending.
    const onboardingPending = localStorage.getItem(ONBOARDING_PENDING_KEY) === 'true';
    const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';

    if (onboardingPending && !onboardingDone) {
      setOnboardingRequired(true);
      setCurrentPage('onboardingCategories');
    } else {
      setOnboardingRequired(false);
    }
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleRegister = async (payload) => {
    try {
        const registerUrl = 'http://127.0.0.1:8000/user/register';
        const loginUrl = 'http://127.0.0.1:8000/login';

        console.log('[register] start', { email: payload?.email });

        let didCreateAccount = false;

        const response = await fetchWithTimeout(
          registerUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
          20000
        );

        console.log('[register] response', response.status);

        if (!response.ok) {
          const errorData = await safeReadJson(response);
          const detail = errorData?.detail || 'Registration failed';
          const lower = String(detail).toLowerCase();
          const alreadyRegistered =
            lower.includes('bereits registriert') ||
            lower.includes('already registered') ||
            lower.includes('already exists');

          if (!alreadyRegistered) {
            throw new Error(detail);
          }

          console.warn('[register] email exists; attempting login');
        } else {
          didCreateAccount = true;
        }

        // Auto-login after registration (or if user already exists)
        const formData = new URLSearchParams();
        formData.append('username', payload.email);
        formData.append('password', payload.password);

        console.log('[register] login start');
        const loginResponse = await fetchWithTimeout(
          loginUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          },
          20000
        );

        console.log('[register] login response', loginResponse.status);

        if (!loginResponse.ok) {
          const errorData = await safeReadJson(loginResponse);
          const detail = errorData?.detail || 'Login failed';
          if (didCreateAccount) {
            throw new Error(`Account created, but auto-login failed (${detail}). Please go to login.`);
          }
          throw new Error(`Account already exists, but login failed (${detail}). Please go to login.`);
        }

        const result = await loginResponse.json();
        localStorage.setItem('authToken', result.access_token);
        setIsAuthenticated(true);

        // Trigger onboarding only after registration.
        localStorage.setItem(ONBOARDING_PENDING_KEY, 'true');
        localStorage.setItem(ONBOARDING_DONE_KEY, 'false');
        setOnboardingRequired(true);
        setCurrentPage('onboardingCategories');
    } catch (error) {
        console.error('[register] failed', error);
        throw error;
    }
  };

  const handleLogin = async (payload) => {
    try {
        const formData = new URLSearchParams();
        formData.append('username', payload.email);
        formData.append('password', payload.password);

      console.log('[login] start', { email: payload?.email });

      const response = await fetchWithTimeout('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
      }, 20000);

      console.log('[login] response', response.status);

        if (!response.ok) {
        const errorData = await safeReadJson(response);
        throw new Error(errorData?.detail || 'Login failed');
        }

        const result = await response.json();
        localStorage.setItem('authToken', result.access_token);
        setIsAuthenticated(true);

        // Normal login should not trigger onboarding unless it was previously marked as pending.
        const onboardingPending = localStorage.getItem(ONBOARDING_PENDING_KEY) === 'true';
        const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
        if (onboardingPending && !onboardingDone) {
          setOnboardingRequired(true);
          setCurrentPage('onboardingCategories');
        } else {
          setOnboardingRequired(false);
          setCurrentPage('dashboard');
        }
    } catch (error) {
      console.error('[login] failed', error);
      throw error;
    }
};

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setCurrentPage('login');
    setOnboardingRequired(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
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
        return <Transactions />;
      case 'quickEntry':
        return <QuickEntry />;
      case 'scanReceipts':
        return <ReceiptCapture />;
      case 'settings':
        return <Settings />;
      case 'aiInsights':
        return <AIInsights />;
      case 'onboardingCategories':
        return (
          <OnboardingCategories
            onDone={() => {
              localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
              localStorage.setItem(ONBOARDING_PENDING_KEY, 'false');
              setOnboardingRequired(false);
              setCurrentPage('dashboard');
            }}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  // Show fullscreen login if not authenticated
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        {currentPage === 'register' ? (
          <Register
            onSubmit={handleRegister}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : (
          <Login
            onSubmit={handleLogin}
            onNavigate={(page) => setCurrentPage(page)}
          />
        )}
      </Box>
    );
  }

  // Lock app navigation during onboarding
  if (onboardingRequired || currentPage === 'onboardingCategories') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: { xs: 1, md: 3 },
        }}
      >
        {renderPage()}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Header handleDrawerToggle={handleDrawerToggle} />
      <NavBar
        setCurrentPage={setCurrentPage}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        onLogout={handleLogout}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, md: 3 },
          width: { xs: '100%', md: `calc(100% - 240px)` },
          overflowX: 'hidden'
        }}
      >
        <Toolbar /> {/* header */}
        {renderPage()}
      </Box>
    </Box>
  );
}

export default App;