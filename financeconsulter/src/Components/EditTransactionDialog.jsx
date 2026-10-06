import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Typography,
  IconButton,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { API_URL } from '../services/api';

const EditTransactionDialog = ({ open, onClose, transaction, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    account_id: '',
    category_id: '',
    tags: [],
  });
  // Raw input string so the amount can be retyped/cleared freely
  const [amountInput, setAmountInput] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/account/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, [getAuthHeaders]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/category/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [getAuthHeaders]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tag/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchCategories();
      fetchTags();
      
      if (transaction) {
        // Populate form with transaction data
        setFormData({
          date: transaction.date?.split('T')[0] || '',
          description: transaction.description || '',
          account_id: transaction.account_id || '',
          category_id: transaction.category_id || '',
          tags: transaction.tags?.map(tag => tag.id) || [],
        });
        setAmountInput(((transaction.amount_cents || 0) / 100).toFixed(2));
      }
    }
  }, [open, transaction, fetchAccounts, fetchCategories, fetchTags]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmountChange = (e) => {
    setAmountInput(e.target.value);
  };

  const handleTagChange = (event) => {
    const { value } = event.target;
    setFormData(prev => ({
      ...prev,
      tags: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleSubmit = async () => {
    // Convert to cents
    const amountCents = Math.round(parseFloat(amountInput) * 100);
    if (!Number.isFinite(amountCents)) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // category_id/tags are always sent explicitly (null / []) so they can be cleared
      const submitData = {
        date: formData.date,
        description: formData.description,
        amount_cents: amountCents,
        account_id: formData.account_id || null,
        category_id: formData.category_id || null,
        tags: formData.tags || [],
      };

      console.log('Submitting transaction update:', submitData);

      const response = await fetch(`${API_URL}/transaction/${transaction.id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        onSuccess('Transaction updated successfully!');
        onClose();
      } else {
        const errorData = await response.json();
        // Handle validation errors (array of error objects)
        if (Array.isArray(errorData.detail)) {
          const errorMessages = errorData.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
          setError(errorMessages);
        } else if (typeof errorData.detail === 'string') {
          setError(errorData.detail);
        } else if (typeof errorData.detail === 'object') {
          setError(JSON.stringify(errorData.detail));
        } else {
          setError('Failed to update transaction');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error updating transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            ✏️ Edit Transaction
          </Typography>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
          />
          
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            required
          />
          
          <TextField
            label="Amount"
            type="number"
            value={amountInput}
            onChange={handleAmountChange}
            fullWidth
            required
            inputProps={{ step: '0.01' }}
          />
          
          <FormControl fullWidth required>
            <InputLabel>Account</InputLabel>
            <Select
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              label="Account"
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} ({account.currency_code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              label="Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={formData.tags}
              onChange={handleTagChange}
              input={<OutlinedInput label="Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((tagId) => {
                    const tag = availableTags.find(t => t.id === tagId);
                    return tag ? (
                      <Chip
                        key={tagId}
                        label={tag.name}
                        size="small"
                        sx={{
                          backgroundColor: tag.color,
                          color: 'white',
                        }}
                      />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  <Chip
                    label={tag.name}
                    size="small"
                    sx={{
                      backgroundColor: tag.color,
                      color: 'white',
                      mr: 1,
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && (
            <Box sx={{ color: 'error.main', fontSize: '0.875rem' }}>
              {error}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTransactionDialog;
