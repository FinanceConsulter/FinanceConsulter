import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import AccountTransactionsTab from './Transactions/AccountTransactionsTab';
import AllTransactionsTab from './Transactions/AllTransactionsTab';
import ItemsTab from './Transactions/ItemsTab';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Transactions() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box 
      sx={{ 
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: { xs: 'calc(100vw - 32px)', sm: 'calc(100vw - 48px)', md: '1200px' },
          p: { xs: 2, sm: 3 },
          pb: { xs: 6, sm: 4 },
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          💳 Transactions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          View and manage all your transactions
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
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  fontWeight: { xs: 600, sm: 400 },
                  minWidth: { xs: 85, sm: 120 },
                  maxWidth: { xs: 95, sm: 180 },
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
                label="By Account" 
                icon={<AccountBalanceWalletIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="By Account"
              />
              <Tab 
                label="All Transactions" 
                icon={<ReceiptLongIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="All Transactions"
              />
              <Tab 
                label="Items" 
                icon={<ShoppingCartIcon />} 
                iconPosition={isMobile ? 'top' : 'start'}
                aria-label="Items"
              />
            </Tabs>
          </Box>

          <CardContent sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 4, sm: 4 } }}>
            <TabPanel value={tabValue} index={0}>
              <AccountTransactionsTab />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <AllTransactionsTab />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <ItemsTab />
            </TabPanel>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
