import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EditTransactionDialog from '../../Components/EditTransactionDialog';

export default function AllTransactionsTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [receiptByTransactionId, setReceiptByTransactionId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch accounts
      const accountsResponse = await fetch('http://127.0.0.1:8000/account/', {
        headers: getAuthHeaders()
      });
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData);

      // Fetch categories
      const categoriesResponse = await fetch('http://127.0.0.1:8000/category/', {
        headers: getAuthHeaders()
      });
      let categoriesData = [];
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        categoriesData = Array.isArray(data) ? data : [];
      }
      setCategories(categoriesData);

      // Fetch transactions
      const transactionsResponse = await fetch('http://127.0.0.1:8000/transaction/', {
        headers: getAuthHeaders()
      });

      // Handle case when no transactions exist (backend returns 200 with detail message)
      let transactionsData = [];
      if (transactionsResponse.ok) {
        const data = await transactionsResponse.json();
        // Check if response is an array or an error object with detail
        transactionsData = Array.isArray(data) ? data : [];
        // Sort by date descending
        transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      
      setTransactions(transactionsData);

      // Fetch receipts to detect receipt-backed transactions
      const receiptsResponse = await fetch('http://127.0.0.1:8000/receipt/', {
        headers: getAuthHeaders()
      });
      let receiptMap = {};
      if (receiptsResponse.ok) {
        const receiptsData = await receiptsResponse.json();
        const receipts = Array.isArray(receiptsData) ? receiptsData : [];
        receipts.forEach(r => {
          if (r?.transaction_id) {
            receiptMap[r.transaction_id] = r;
          }
        });
      }
      setReceiptByTransactionId(receiptMap);

      setError(null); // Clear any previous errors
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccountById = (accountId) => {
    return accounts.find(acc => acc.id === accountId);
  };

  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId);
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
    fetchData();
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
      
      // Refresh data
      fetchData();
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

  // Calculate stats
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount_cents, 0) / 100;

  // Calculate this month stats
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const transactionsThisMonth = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= thisMonthStart && transactionDate <= thisMonthEnd;
  });

  const totalTransactionsThisMonth = transactionsThisMonth.length;

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
      {/* Stats Cards */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2} 
        mb={3}
      >
        <Card sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>
              💰
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalTransactions}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>
              📊
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalTransactionsThisMonth}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Transactions This Month
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>
              💵
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalAmount.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Amount
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Transactions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            All Transactions
          </Typography>
          {transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No transactions found. Create your first transaction!
              </Typography>
            </Box>
          ) : isMobile ? (
            // Mobile Card View
            <Stack spacing={2} sx={{ mt: 2 }}>
              {transactions.map(transaction => {
                const account = getAccountById(transaction.account_id);
                const receipt = receiptByTransactionId[transaction.id];
                return (
                  <Card key={transaction.id} variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={1.5}>
                        {/* Header: Description and Amount */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="body1" fontWeight={600} sx={{ flex: 1, pr: 2 }}>
                            {transaction.description}
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{
                              color: transaction.amount_cents >= 0 ? 'success.main' : 'error.main',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {formatAmount(transaction.amount_cents, account?.currency_code || 'CHF')}
                          </Typography>
                        </Box>

                        {/* Date */}
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(transaction.date)}
                        </Typography>

                        {/* Transaction ID */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            ID:
                          </Typography>
                          <Chip label={`#${transaction.id}`} size="small" variant="outlined" />
                        </Box>

                        {/* Receipt (only for receipt transactions) */}
                        {receipt?.id && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                              Receipt:
                            </Typography>
                            <Chip label={`#${receipt.id}`} size="small" variant="outlined" />
                          </Box>
                        )}

                        {/* Account */}
                        {account && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                              Account:
                            </Typography>
                            <Chip 
                              label={account.name} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        )}

                        {/* Category */}
                        {transaction.category_id && (() => {
                          const category = getCategoryById(transaction.category_id);
                          return category ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                                Category:
                              </Typography>
                              <Chip label={category.name} size="small" />
                            </Box>
                          ) : null;
                        })()}

                        {/* Tags */}
                        {transaction.tags && transaction.tags.length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                              Tags:
                            </Typography>
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
                          </Box>
                        )}

                        {/* Actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditTransaction(transaction)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteClick(transaction)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            // Desktop Table View
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map(transaction => {
                    const account = getAccountById(transaction.account_id);
                    const receipt = receiptByTransactionId[transaction.id];
                    return (
                      <TableRow key={transaction.id} hover>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            #{transaction.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {receipt?.id ? (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              #{receipt.id}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          {account ? (
                            <Chip 
                              label={account.name} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.category_id ? (() => {
                            const category = getCategoryById(transaction.category_id);
                            return category ? (
                              <Chip label={category.name} size="small" />
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            );
                          })() : (
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
                          {formatAmount(transaction.amount_cents, account?.currency_code || 'CHF')}
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
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
