import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CloseIcon from '@mui/icons-material/Close';

export default function AccountsTab({ onSuccess, onError, isMobile }) {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountFormData, setAccountFormData] = useState({ 
    name: '', 
    type: 'asset', 
    currency_code: 'CHF' 
  });
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/account/', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(Array.isArray(data) ? data : []);
      } else if (response.status === 200) {
        setAccounts([]);
      }
    } catch (err) {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setAccountFormData({ name: '', type: 'asset', currency_code: 'CHF' });
    setAccountDialogOpen(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setAccountFormData({ 
      name: account.name, 
      type: account.type || 'asset', 
      currency_code: account.currency_code || 'CHF' 
    });
    setAccountDialogOpen(true);
  };

  const handleSaveAccount = async () => {
    const trimmedName = accountFormData.name.trim();
    
    if (!trimmedName) {
      onError('Account name is required');
      return;
    }

    if (!accountFormData.type) {
      onError('Account type is required');
      return;
    }

    if (!accountFormData.currency_code) {
      onError('Currency is required');
      return;
    }

    try {
      const url = editingAccount 
        ? 'http://127.0.0.1:8000/account/update'
        : 'http://127.0.0.1:8000/account/new';
      
      const body = editingAccount
        ? { 
            id: editingAccount.id, 
            name: trimmedName, 
            type: accountFormData.type, 
            currency_code: accountFormData.currency_code
          }
        : { 
            name: trimmedName, 
            type: accountFormData.type, 
            currency_code: accountFormData.currency_code
          };

      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        let errorMessage = editingAccount ? 'Unable to update account' : 'Unable to create account';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.detail) {
            errorMessage = errorJson.detail.replace(/[{}"]/g, '');
          }
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      onSuccess(editingAccount ? 'Account updated!' : 'Account created!');
      setAccountDialogOpen(false);
      setEditingAccount(null);
      setAccountFormData({ name: '', type: 'asset', currency_code: 'CHF' });
      fetchAccounts();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/account/${accountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      onSuccess('Account deleted successfully!');
      setDeleteAccountDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      onError(err.message);
      setDeleteAccountDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const openDeleteAccountDialog = (account) => {
    setAccountToDelete(account);
    setDeleteAccountDialogOpen(true);
  };

  const getAccountTypeLabel = (type) => {
    const types = {
      'asset': 'Asset',
      'liability': 'Liability',
      'cash': 'Cash'
    };
    return types[type] || type;
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      'asset': 'primary',
      'liability': 'error',
      'cash': 'success'
    };
    return colors[type] || 'default';
  };

  return (
    <>
      <Stack spacing={3}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Manage Accounts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage your financial accounts
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateAccount}
            fullWidth={isMobile}
            sx={{ minWidth: { xs: 'auto', sm: 140 } }}
          >
            New Account
          </Button>
        </Box>

        <Divider />

        {accountsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : accounts.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No accounts yet. Create your first account to get started!
            </Typography>
          </Paper>
        ) : (
          <List>
            {Array.isArray(accounts) && accounts.map((account) => (
              <ListItem
                key={account.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  alignItems: 'flex-start',
                  py: 2,
                  pl: 2,
                  pr: 2,
                  position: 'relative'
                }}
                secondaryAction={
                  <Stack 
                    direction="row" 
                    spacing={1} 
                    sx={{ 
                      mt: 0.5,
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <IconButton edge="end" onClick={() => handleEditAccount(account)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => openDeleteAccountDialog(account)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccountBalanceIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography 
                        variant="body1" 
                        fontWeight={600}
                        sx={{ 
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          pr: 2
                        }}
                      >
                        {account.name}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.5 }}>
                      <Chip 
                        label={getAccountTypeLabel(account.type)} 
                        size="small" 
                        color={getAccountTypeColor(account.type)}
                        variant="outlined"
                        sx={{ width: 'fit-content', fontSize: '0.75rem' }}
                      />
                      <Chip 
                        label={account.currency_code} 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                        sx={{ width: 'fit-content', fontSize: '0.75rem' }}
                      />
                    </Stack>
                  }
                  sx={{
                    flex: 1,
                    mr: 10,
                    pr: 10
                  }}
                  slotProps={{
                    primary: {
                      component: 'div'
                    },
                    secondary: {
                      component: 'div'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>

      {/* Account Dialog */}
      <Dialog 
        open={accountDialogOpen} 
        onClose={() => setAccountDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              m: { xs: 2, sm: 3 },
              maxHeight: { xs: '90vh', sm: '80vh' }
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {editingAccount ? 'Edit Account' : 'Create New Account'}
          </Typography>
          <IconButton edge="end" onClick={() => setAccountDialogOpen(false)} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Account Name"
              value={accountFormData.name}
              onChange={(e) => setAccountFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Main Bank Account, Credit Card, Cash"
              helperText="Choose a descriptive name for your account"
              inputProps={{
                maxLength: 100,
              }}
            />
            
            <FormControl fullWidth required>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={accountFormData.type}
                onChange={(e) => setAccountFormData(prev => ({ ...prev, type: e.target.value }))}
                label="Account Type"
              >
                <MenuItem value="asset">
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>Asset</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Bank accounts, investments, savings
                    </Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="liability">
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>Liability</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Credit cards, loans, debts
                    </Typography>
                  </Stack>
                </MenuItem>
                <MenuItem value="cash">
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>Cash</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Physical cash on hand
                    </Typography>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Currency</InputLabel>
              <Select
                value={accountFormData.currency_code}
                onChange={(e) => setAccountFormData(prev => ({ ...prev, currency_code: e.target.value }))}
                label="Currency"
              >
                <MenuItem value="CHF">CHF - Swiss Franc</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button onClick={() => setAccountDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAccount} fullWidth={isMobile}>
            {editingAccount ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog 
        open={deleteAccountDialogOpen} 
        onClose={() => setDeleteAccountDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          Delete Account
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body1">
              Are you sure you want to delete the account <strong>"{accountToDelete?.name}"</strong>?
            </Typography>
            
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: 'warning.lighter',
                border: '1px solid',
                borderColor: 'warning.main'
              }}
            >
              <Stack spacing={1}>
                <Typography variant="body2" fontWeight={600} color="warning.dark">
                  ⚠️ Warning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deleting this account will also delete all associated transactions.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This action cannot be undone.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteAccountDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handleDeleteAccount(accountToDelete?.id)}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
