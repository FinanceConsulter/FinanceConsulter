import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LabelIcon from '@mui/icons-material/Label';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import ProfileTab from './Settings/ProfileTab';
import SecurityTab from './Settings/SecurityTab';
import TagsTab from './Settings/TagsTab';
import CategoriesTab from './Settings/CategoriesTab';
import AccountsTab from './Settings/AccountsTab';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load user data');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: { xs: 'calc(95vw - 32px)', sm: 'calc(95vw - 48px)', md: '1200px' },
          p: { xs: 2, sm: 3 },
          pb: { xs: 6, sm: 4 },
          boxSizing: 'border-box'
        }}
      >
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your account settings and preferences
        </Typography>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)} 
              variant="scrollable" 
              scrollButtons="auto"
              allowScrollButtonsMobile
              visibleScrollbar={false}
              sx={{
                minHeight: { xs: 64, sm: 64 },
                '& .MuiTabs-scrollButtons': {
                  width: { xs: 36, sm: 40 },
                  '&.Mui-disabled': { opacity: 0.3 }
                },
                '& .MuiTabs-scroller': {
                  overflow: 'hidden !important'
                },
                '& .MuiTab-root': {
                  minHeight: { xs: 64, sm: 64 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: { xs: 600, sm: 400 },
                  minWidth: { xs: 92, sm: 100 },
                  maxWidth: { xs: 95, sm: 160 },
                  px: { xs: 0.75, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 0 },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  '& .MuiTab-iconWrapper': {
                    fontSize: { xs: '1.25rem', sm: '1.25rem' },
                    marginRight: { xs: 0, sm: 1 },
                    marginBottom: { xs: 0.5, sm: 0 }
                  }
                }
              }}
            >
              <Tab 
                label="Profile" 
                icon={<PersonIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Profile"
              />
              <Tab 
                label="Security" 
                icon={<LockIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Security"
              />
              <Tab 
                label="Tags" 
                icon={<LabelIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Tags"
              />
              <Tab 
                label="Categories" 
                icon={<CategoryIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Categories"
              />
              <Tab 
                label="Accounts" 
                icon={<AccountBalanceIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Accounts"
              />
            </Tabs>
          </Box>

          <CardContent sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 4, sm: 4 } }}>
          <TabPanel value={tabValue} index={0}>
            <ProfileTab 
              user={user} 
              onSuccess={setSuccess} 
              onError={setError} 
              isMobile={isMobile}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <SecurityTab 
              user={user} 
              onSuccess={setSuccess} 
              onError={setError} 
              isMobile={isMobile}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TagsTab 
              onSuccess={setSuccess} 
              onError={setError} 
              isMobile={isMobile}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <CategoriesTab 
              onSuccess={setSuccess} 
              onError={setError} 
              isMobile={isMobile}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <AccountsTab 
              onSuccess={setSuccess} 
              onError={setError} 
              isMobile={isMobile}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="filled"
          icon={<ErrorIcon />}
          sx={{ width: '100%', maxWidth: '500px' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess(null)} 
          severity="success" 
          variant="filled"
          icon={<CheckCircleIcon />}
          sx={{ width: '100%', maxWidth: '500px' }}
        >
          {success}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
}
