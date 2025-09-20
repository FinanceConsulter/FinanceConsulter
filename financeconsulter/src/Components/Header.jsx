import { AppBar, Toolbar, Typography } from '@mui/material';

function Header() {
  return (
    <AppBar 
      position="fixed" 
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}  // Above drawer
    >
      <Toolbar>
        <Typography variant="h6" component="div">
          My App
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Header;