import { Drawer, List, ListItem, ListItemText, Toolbar, useMediaQuery, useTheme, Divider, ListItemIcon } from '@mui/material';
import { 
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  AddCircle as AddCircleIcon,
  CameraAlt as CameraAltIcon,
  SmartToy as SmartToyIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

function NavBar({ setCurrentPage, mobileOpen, handleDrawerToggle, onLogout }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const onNavigate = (page) => {
    setCurrentPage(page);
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  const handleLogoutClick = () => {
    if (isMobile) {
      handleDrawerToggle();
    }
    onLogout();
  };

  const drawerContent = (
    <>
      <Toolbar /> {/* Spacer for header */}
      <List>
        <ListItem button onClick={() => onNavigate('dashboard')}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => onNavigate('transactions')}>
          <ListItemIcon>
            <ReceiptIcon />
          </ListItemIcon>
          <ListItemText primary="Transactions" />
        </ListItem>
        <ListItem button onClick={() => onNavigate('quickEntry')}>
          <ListItemIcon>
            <AddCircleIcon />
          </ListItemIcon>
          <ListItemText primary="Quick Entry" />
        </ListItem>
        <ListItem button onClick={() => onNavigate('scanReceipts')}>
          <ListItemIcon>
            <CameraAltIcon />
          </ListItemIcon>
          <ListItemText primary="Receipts" />
        </ListItem>
        <ListItem button onClick={() => onNavigate('aiInsights')}>
          <ListItemIcon>
            <SmartToyIcon />
          </ListItemIcon>
          <ListItemText primary="AI Insights" />
        </ListItem>
        <ListItem button onClick={() => onNavigate('settings')}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 240,
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' }
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export default NavBar;