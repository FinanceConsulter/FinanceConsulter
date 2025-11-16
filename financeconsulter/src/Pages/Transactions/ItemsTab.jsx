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
  Chip,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function ItemsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      // Fetch all transactions to get line items
      const transactionsResponse = await fetch('http://127.0.0.1:8000/transaction/', {
        headers: getAuthHeaders()
      });

      if (!transactionsResponse.ok) {
        throw new Error('Failed to load transactions');
      }

      const transactionsData = await transactionsResponse.json();
      
      // Extract all line items from transactions
      const allItems = [];
      transactionsData.forEach(transaction => {
        if (transaction.line_items && Array.isArray(transaction.line_items)) {
          transaction.line_items.forEach(item => {
            allItems.push({
              ...item,
              transaction_id: transaction.id,
              transaction_date: transaction.date,
              transaction_description: transaction.description
            });
          });
        }
      });

      setItems(allItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amountCents) => {
    return (amountCents / 100).toFixed(2);
  };

  // Calculate stats for this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const itemsThisMonth = items.filter(item => {
    const itemDate = new Date(item.transaction_date);
    return itemDate >= thisMonthStart && itemDate <= thisMonthEnd;
  });

  const totalItems = items.length;
  const totalItemsThisMonth = itemsThisMonth.length;
  const totalValueThisMonth = itemsThisMonth.reduce((sum, item) => 
    sum + (item.price_cents * item.quantity), 0
  ) / 100;

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
              📦
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items (All Time)
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>
              🛒
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalItemsThisMonth}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items This Month
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>
              💰
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalValueThisMonth.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value This Month
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Items Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            All Line Items
          </Typography>
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No items found. Items are extracted from transaction receipts.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Transaction</TableCell>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.transaction_id}-${index}`} hover>
                      <TableCell>{formatDate(item.transaction_date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {item.transaction_description}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatAmount(item.price_cents)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatAmount(item.price_cents * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
