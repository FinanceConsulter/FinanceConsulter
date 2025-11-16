import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EditTransactionDialog from '../../Components/EditTransactionDialog';

export default function AccountTransactionsTab() {
  const [accounts, setAccounts] = useState([]);
  const [accountTransactions, setAccountTransactions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  useEffect(() => {
    fetchAccountsWithTransactions();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchAccountsWithTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch accounts
      const accountsResponse = await fetch('http://127.0.0.1:8000/account/', {
        headers: getAuthHeaders()
      });

      if (!accountsResponse.ok) {
        throw new Error('Failed to load accounts');
      }

      const accountsData = await accountsResponse.json();
      setAccounts(accountsData);

      // Fetch all transactions
      const transactionsResponse = await fetch('http://127.0.0.1:8000/transaction/', {
        headers: getAuthHeaders()
      });

      let transactionsData = [];
      if (transactionsResponse.ok) {
        const data = await transactionsResponse.json();
        transactionsData = Array.isArray(data) ? data : [];
      }

      // Group transactions by account
      const grouped = {};
      accountsData.forEach(account => {
        grouped[account.id] = transactionsData.filter(t => t.account_id === account.id);
      });

      setAccountTransactions(grouped);
      setError(null); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (accountId) => {
    setExpandedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const formatAmount = (amountCents, currencyCode) => {
    const amount = amountCents / 100;
    return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)} ${currencyCode}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditTransaction = (transaction) => {
    setTransactionToEdit(transaction);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = (message) => {
    setSuccessMessage(message);
    setEditDialogOpen(false);
    setTransactionToEdit(null);
    fetchAccountsWithTransactions();
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/transaction/${transactionToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      setSuccessMessage('Transaction deleted successfully!');
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      
      fetchAccountsWithTransactions();
    } catch (err) {
      setError(err.message);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Transactions by Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View all transactions grouped by account
      </Typography>

      {accounts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No accounts found. Create an account first to track transactions.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {accounts.map(account => {
            const transactions = accountTransactions[account.id] || [];
            const totalAmount = transactions.reduce((sum, t) => sum + t.amount_cents, 0);
            const isExpanded = expandedAccounts.includes(account.id);

            return (
              <Accordion 
                key={account.id}
                expanded={isExpanded}
                onChange={() => handleAccordionChange(account.id)}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', pr: 2 }}>
                    <AccountBalanceIcon color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {account.name}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={account.type} size="small" color="primary" variant="outlined" />
                        <Chip label={account.currency_code} size="small" color="secondary" variant="outlined" />
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        fontWeight={600}
                        color={totalAmount >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatAmount(totalAmount, account.currency_code)}
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {transactions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      No transactions for this account yet.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Tags</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transactions.map(transaction => (
                            <TableRow key={transaction.id}>
                              <TableCell>{formatDate(transaction.date)}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                {transaction.category_id ? (
                                  <Chip label="Category" size="small" />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {transaction.tags && transaction.tags.length > 0 ? (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {transaction.tags.map(tag => (
                                      <Chip
                                        key={tag.id}
                                        label={tag.name}
                                        size="small"
                                        sx={{
                                          backgroundColor: tag.color,
                                          color: 'white',
                                          fontSize: '0.75rem',
                                        }}
                                      />
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell 
                                align="right"
                                sx={{ 
                                  fontWeight: 600,
                                  color: transaction.amount_cents >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                {formatAmount(transaction.amount_cents, account.currency_code)}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={() => handleEditTransaction(transaction)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => handleDeleteClick(transaction)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the transaction "{transactionToDelete?.description}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setTransactionToEdit(null);
        }}
        transaction={transactionToEdit}
        onSuccess={handleEditSuccess}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
}
