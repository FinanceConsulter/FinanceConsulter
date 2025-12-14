import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function ReceiptReviewDialog({ open, onClose, initialData, onSave, loading }) {
  const [merchantName, setMerchantName] = useState('');
  const [date, setDate] = useState('');
  const [total, setTotal] = useState('');
  const [items, setItems] = useState([]);
  
  // Transaction fields
  const [createTransaction, setCreateTransaction] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    if (open) {
        // Fetch dropdown data
        (async () => {
          try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const accountsRes = await fetch('http://127.0.0.1:8000/account/', {
              headers: getAuthHeaders()
            });
            if (!accountsRes.ok) return;

            const accountsData = await accountsRes.json();
            const safeAccounts = Array.isArray(accountsData) ? accountsData : [];
            setAccounts(safeAccounts);
            if (!selectedAccount && safeAccounts.length > 0) {
              setSelectedAccount(safeAccounts[0].id);
            }
          } catch (e) {
            console.error(e);
          }
        })();
    }
  }, [open, selectedAccount]);

  useEffect(() => {
    if (initialData) {
      setMerchantName(initialData.merchant || '');
      
      // Format date to YYYY-MM-DD for input type="date"
      let formattedDate = '';
      if (initialData.date) {
          // Try to parse DD/MM/YYYY or similar
          // Simple regex for DD/MM/YYYY or DD-MM-YYYY
          const parts = initialData.date.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
          if (parts) {
              let year = parts[3];
              if (year.length === 2) year = '20' + year;
              const month = parts[2].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              formattedDate = `${year}-${month}-${day}`;
          } else {
              formattedDate = initialData.date;
          }
      }
      setDate(formattedDate || new Date().toISOString().split('T')[0]);
      
      setTotal(initialData.total || '');
      
      if (initialData.items) {
        setItems(initialData.items.map(item => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9) // Temp ID for React keys
        })));
      } else {
        setItems([]);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (!items || items.length === 0) return;

    const sum = items.reduce((acc, item) => {
      const quantity = Number.parseFloat(item.quantity);
      const price = Number.parseFloat(item.price);
      const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
      const safePrice = Number.isFinite(price) ? price : 0;
      return acc + safeQuantity * safePrice;
    }, 0);

    const nextTotal = Number.isFinite(sum) ? sum.toFixed(2) : '0.00';
    if (nextTotal !== total) {
      setTotal(nextTotal);
    }
  }, [items, total]);

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: '0',
      quantity: 1
    }]);
  };

  const handleSave = () => {
    // Convert to API format
    const totalCents = total ? Math.round(parseFloat(total) * 100) : 0;
    
    const lineItems = items.map(item => {
        const priceCents = item.price ? Math.round(parseFloat(item.price) * 100) : 0;
        return {
            product_name: item.name,
            quantity: parseFloat(item.quantity) || 1,
            unit_price_cents: priceCents,
            total_price_cents: priceCents * (parseFloat(item.quantity) || 1)
        };
    });

    const payload = {
      merchant_name: merchantName,
      purchase_date: date,
      total_cents: totalCents,
      line_items: lineItems,
      create_transaction: createTransaction,
      account_id: createTransaction ? selectedAccount : null,
      category_id: null // Category selection disabled
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Scanned Receipt</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <TextField
            label="Merchant"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Total"
              value={total}
              fullWidth
              type="number"
              InputProps={{
                readOnly: true,
                startAdornment: <Typography sx={{ mr: 1 }}>CHF</Typography>
              }}
            />
          </Stack>

          <Divider />
          
          <FormControlLabel
            control={<Checkbox checked={createTransaction} onChange={(e) => setCreateTransaction(e.target.checked)} />}
            label="Create Transaction automatically"
          />
          
          {createTransaction && (
              <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                      <InputLabel>Account</InputLabel>
                      <Select
                          value={selectedAccount}
                          label="Account"
                          onChange={(e) => setSelectedAccount(e.target.value)}
                      >
                          {accounts.map(acc => (
                              <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                          ))}
                      </Select>
                  </FormControl>
              </Stack>
          )}

          <Divider />
          
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Items</Typography>
                <Button startIcon={<AddIcon />} onClick={handleAddItem} size="small">
                    Add Item
                </Button>
            </Stack>
            
            <Stack spacing={2}>
              {items.map((item) => (
                <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Item Name"
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                    sx={{ width: 80 }}
                    type="number"
                    size="small"
                  />
                  <TextField
                    label="Price"
                    value={item.price}
                    onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                    sx={{ width: 100 }}
                    type="number"
                    size="small"
                  />
                  <IconButton color="error" onClick={() => handleDeleteItem(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              {items.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center">
                      No items detected. Add items manually if needed.
                  </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={loading || (createTransaction && !selectedAccount)}
        >
          {loading ? 'Saving...' : 'Confirm & Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
