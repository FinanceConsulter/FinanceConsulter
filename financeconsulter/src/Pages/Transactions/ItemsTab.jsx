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
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function ItemsTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const [receiptsRes, merchantsRes, transactionsRes, categoriesRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/receipt/', { headers }),
          fetch('http://127.0.0.1:8000/merchant/', { headers }),
          fetch('http://127.0.0.1:8000/transaction/', { headers }),
          fetch('http://127.0.0.1:8000/category/', { headers }),
        ]);

        if (!receiptsRes.ok) {
          throw new Error('Failed to load receipts');
        }

        const receiptsData = await receiptsRes.json();
        const receipts = Array.isArray(receiptsData) ? receiptsData : [];

        let merchants = [];
        if (merchantsRes.ok) {
          const merchantsData = await merchantsRes.json();
          merchants = Array.isArray(merchantsData) ? merchantsData : [];
        }

        let transactions = [];
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          transactions = Array.isArray(transactionsData) ? transactionsData : [];
        }

        let categories = [];
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          categories = Array.isArray(categoriesData) ? categoriesData : [];
        }

        const merchantById = new Map(merchants.map(m => [m.id, m]));
        const transactionById = new Map(transactions.map(t => [t.id, t]));
        const categoryById = new Map(categories.map(c => [c.id, c]));

        const allItems = [];
        receipts.forEach(receipt => {
          const receiptItems = Array.isArray(receipt?.line_items) ? receipt.line_items : [];
          const merchant = receipt?.merchant_id ? merchantById.get(receipt.merchant_id) : null;
          const merchantName = merchant?.name || (receipt.merchant_id ? `Merchant ${receipt.merchant_id}` : 'Unknown');
          const transaction = receipt?.transaction_id ? transactionById.get(receipt.transaction_id) : null;
          const category = transaction?.category_id ? categoryById.get(transaction.category_id) : null;
          const categoryName = category?.name || (transaction?.category_id ? `Category ${transaction.category_id}` : null);

          receiptItems.forEach(item => {
            allItems.push({
              ...item,
              purchase_date: receipt.purchase_date,
              merchant_id: receipt.merchant_id,
              merchant_name: merchantName,
              receipt_total_cents: receipt.total_cents,
              receipt_transaction_id: receipt.transaction_id,
              transaction_id: receipt.transaction_id,
              transaction_description: transaction?.description || null,
              transaction_amount_cents: typeof transaction?.amount_cents === 'number' ? transaction.amount_cents : null,
              transaction_currency_code: transaction?.currency_code || null,
              category_id: transaction?.category_id ?? null,
              category_name: categoryName,
            });
          });
        });

        allItems.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

        setItems(allItems);
        setError(null);
      } catch (err) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amountCents) => {
    const safe = typeof amountCents === 'number' ? amountCents : 0;
    return (safe / 100).toFixed(2);
  };

  const formatTransactionLabel = (item) => {
    if (item?.transaction_id && item?.transaction_description) {
      return `#${item.transaction_id} - ${item.transaction_description}`;
    }
    if (item?.transaction_id) return `#${item.transaction_id}`;
    if (item?.transaction_description) return item.transaction_description;
    if (item?.transaction_id) return `#${item.transaction_id}`;
  };

  const getItemTotalCents = (item) => {
    if (typeof item?.total_price_cents === 'number') return item.total_price_cents;
    const unit = typeof item?.unit_price_cents === 'number' ? item.unit_price_cents : 0;
    const qty = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 0;
    return Math.round(unit * qty);
  };

  // Calculate stats for this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const itemsThisMonth = items.filter(item => {
    const itemDate = new Date(item.purchase_date);
    return itemDate >= thisMonthStart && itemDate <= thisMonthEnd;
  });

  const totalItems = items.length;
  const totalItemsThisMonth = itemsThisMonth.length;
  const totalValueThisMonth = itemsThisMonth.reduce((sum, item) => sum + getItemTotalCents(item), 0) / 100;

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
          ) : isMobile ? (
            // Mobile Card View (like AllTransactionsTab)
            <Stack spacing={2} sx={{ mt: 2 }}>
              {items.map(item => {
                const totalCents = getItemTotalCents(item);
                return (
                  <Card key={item.id} variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="body1" fontWeight={600} sx={{ flex: 1, pr: 2 }}>
                            {item.product_name}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                            {formatAmount(totalCents)} CHF
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {formatDate(item.purchase_date)}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            Merchant:
                          </Typography>
                          <Chip label={item.merchant_name} size="small" color="primary" variant="outlined" />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            Transaction:
                          </Typography>
                          <Chip
                            label={formatTransactionLabel(item)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            Receipt:
                          </Typography>
                          <Chip
                            label={item?.receipt_id ? `#${item.receipt_id}` : '—'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            Category:
                          </Typography>
                          <Chip
                            label={item.category_name || 'Uncategorized'}
                            size="small"
                            color={item.category_name ? 'secondary' : 'default'}
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                            Qty:
                          </Typography>
                          <Typography variant="body2">{item.quantity}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            Unit:
                          </Typography>
                          <Typography variant="body2">{formatAmount(item.unit_price_cents)} CHF</Typography>
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
                    <TableCell>Date</TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Transaction</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} hover>
                      <TableCell>{formatDate(item.purchase_date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                          {item.merchant_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                          {formatTransactionLabel(item)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item?.receipt_id ? (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            #{item.receipt_id}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {item.category_name || 'Uncategorized'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatAmount(item.unit_price_cents)} CHF</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatAmount(getItemTotalCents(item))} CHF
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
