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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LabelIcon from '@mui/icons-material/Label';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
  const [expanded, setExpanded] = useState('panel0'); // For mobile accordion
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

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
      window.dispatchEvent(new Event('fc:user-updated'));
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

  if (!user) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error" variant="filled">
          {error || 'Failed to load user data'}
        </Alert>
      </Box>
    );
  }

  const settingsSections = [
    { id: 'panel0', label: 'Profile', icon: <PersonIcon />, component: <ProfileTab user={user} onUserUpdated={setUser} onSuccess={setSuccess} onError={setError} isMobile={isMobile} /> },
    { id: 'panel1', label: 'Security', icon: <LockIcon />, component: <SecurityTab user={user} onSuccess={setSuccess} onError={setError} isMobile={isMobile} /> },
    { id: 'panel2', label: 'Tags', icon: <LabelIcon />, component: <TagsTab onSuccess={setSuccess} onError={setError} isMobile={isMobile} /> },
    { id: 'panel3', label: 'Categories', icon: <CategoryIcon />, component: <CategoriesTab onSuccess={setSuccess} onError={setError} isMobile={isMobile} /> },
    { id: 'panel4', label: 'Accounts', icon: <AccountBalanceIcon />, component: <AccountsTab onSuccess={setSuccess} onError={setError} isMobile={isMobile} /> },
  ];

  return (
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        bgcolor: 'background.default',
        overflowX: 'hidden'
      }}
    >
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: '1200px',
          p: { xs: 2, sm: 3 },
          pb: { xs: 10, sm: 4 },
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your account settings and preferences
        </Typography>

        {isMobile ? (
          // Mobile View: Accordions
          <Box>
            {settingsSections.map((section) => (
              <Accordion 
                key={section.id}
                expanded={expanded === section.id} 
                onChange={handleAccordionChange(section.id)}
                sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}
                elevation={2}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${section.id}-content`}
                  id={`${section.id}-header`}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'primary.main' }}>
                    {section.icon}
                    <Typography fontWeight={500}>{section.label}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, pt: 0 }}>
                  {section.component}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ) : (
          // Desktop View: Tabs
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={(e, newValue) => setTabValue(newValue)} 
                variant="scrollable" 
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 64,
                  '& .MuiTab-root': {
                    minHeight: 64,
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    minWidth: 'auto',
                    px: 2,
                    py: 1.5,
                    flexDirection: 'row',
                    gap: 1,
                    '& .MuiTab-iconWrapper': {
                      fontSize: '1.25rem',
                      marginRight: '0 !important',
                      marginBottom: '0 !important'
                    }
                  }
                }}
              >
                {settingsSections.map((section, index) => (
                  <Tab 
                    key={index}
                    label={section.label} 
                    icon={section.icon} 
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3, pb: 4 }}>
              {settingsSections.map((section, index) => (
                <TabPanel key={index} value={tabValue} index={index}>
                  {section.component}
                </TabPanel>
              ))}
            </CardContent>
          </Card>
        )}

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
