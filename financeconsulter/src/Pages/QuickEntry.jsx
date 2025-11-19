import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Stack, 
  Typography, 
  TextField, 
  ToggleButtonGroup, 
  ToggleButton, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

export default function QuickEntry() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [transactionType, setTransactionType] = useState('expense'); // 'income' | 'expense'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [accounts, setAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
      setDataLoading(true);
      
      // Fetch accounts
      const accountsRes = await fetch('http://127.0.0.1:8000/account/', {
        headers: getAuthHeaders()
      });
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(Array.isArray(accountsData) ? accountsData : []);

        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0].id);
        }
      }
      
      // Fetch tags
      const tagsRes = await fetch('http://127.0.0.1:8000/tag/', {
        headers: getAuthHeaders()
      });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(Array.isArray(tagsData) ? tagsData : []);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!amount || parseFloat(amount) === 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    try {
      setLoading(true);
      
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const finalAmount = transactionType === 'expense' ? -Math.abs(amountInCents) : Math.abs(amountInCents);

      // Get selected account to use its currency
      const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
      const accountCurrency = selectedAccountData?.currency_code || 'CHF';

      const transactionData = {
        account_id: selectedAccount,
        date: transactionDate,
        description: description.trim(),
        amount_cents: finalAmount,
        currency_code: accountCurrency,
        category_id: null,
        tags: selectedTags.length > 0 ? selectedTags : null
      };

      console.log('Creating transaction:', transactionData);

      const response = await fetch('http://127.0.0.1:8000/transaction/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create transaction');
      }

      // Success feedback
      setSuccess(true);
      setError(null);

      // Reset form
      setTimeout(() => {
        setAmount('');
        setDescription('');
        setSelectedTags([]);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAmount('');
    setDescription('');
    setSelectedTags([]);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setSuccess(false);
  };

  if (dataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        ➕ Quick Entry
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add income or expenses manually
      </Typography>

      <Stack spacing={3} maxWidth={600}>
        <Card>
          <CardContent>
            {/* Type Toggle */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Transaction Type
              </Typography>
              <ToggleButtonGroup
                value={transactionType}
                exclusive
                onChange={(e, val) => val && setTransactionType(val)}
                fullWidth
                size="large"
              >
                <ToggleButton 
                  value="income" 
                  sx={{ 
                    py: 2,
                    '&.Mui-selected': { 
                      bgcolor: 'rgba(46, 125, 50, 0.12)',
                      color: 'success.dark',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.2)' }
                    }
                  }}
                >
                  <AddCircleOutlineIcon sx={{ mr: 1 }} />
                  INCOME
                </ToggleButton>
                <ToggleButton 
                  value="expense"
                  sx={{ 
                    py: 2,
                    '&.Mui-selected': { 
                      bgcolor: 'rgba(211, 47, 47, 0.12)',
                      color: 'error.dark',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.2)' }
                    }
                  }}
                >
                  <RemoveCircleOutlineIcon sx={{ mr: 1 }} />
                  EXPENSE
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Amount */}
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              slotProps={{
                input: {
                  step: '0.01',
                  min: '0',
                  startAdornment: (
                    <Typography variant="h6" sx={{ mr: 1, color: transactionType === 'income' ? 'success.main' : 'error.main' }}>
                      {transactionType === 'income' ? '+' : '-'}
                    </Typography>
                  )
                }
              }}
              sx={{ mb: 2 }}
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Salary, Rent, Groceries"
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            {/* Date */}
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            {/* Account Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Account</InputLabel>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                label="Account"
                required
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} - {account.currency_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags Selection */}
            <Autocomplete
              multiple
              options={tags}
              getOptionLabel={(option) => option.name}
              value={tags.filter(tag => selectedTags.includes(tag.id))}
              onChange={(event, newValue) => {
                setSelectedTags(newValue.map(tag => tag.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags (Optional)"
                  placeholder="Select tags"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                    sx={{ 
                      backgroundColor: option.color, 
                      color: 'white',
                      '& .MuiChip-deleteIcon': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          color: 'white'
                        }
                      }
                    }}
                  />
                ))
              }
              sx={{ mb: 2 }}
            />

            {/* Preview Card */}
            {amount && description && (() => {
              const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
              const accountCurrency = selectedAccountData?.currency_code || 'CHF';
              
              return (
                <Card 
                  variant="outlined" 
                  sx={{ 
                    mt: 3, 
                    borderColor: transactionType === 'income' ? 'success.main' : 'error.main',
                    borderWidth: 2,
                    bgcolor: transactionType === 'income' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)'
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Preview
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(transactionDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="h5" 
                          fontWeight={700}
                          color={transactionType === 'income' ? 'success.main' : 'error.main'}
                        >
                          {transactionType === 'income' ? '+' : '-'}{parseFloat(amount).toFixed(2)} {accountCurrency}
                        </Typography>
                      </Stack>
                    {selectedTags.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                        {selectedTags.map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <Chip 
                              key={tagId} 
                              label={tag.name} 
                              size="small"
                              sx={{ 
                                backgroundColor: tag.color, 
                                color: 'white'
                              }}
                            />
                          ) : null;
                        })}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
              );
            })()}
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert severity="success">
            Transaction saved successfully! 🎉
          </Alert>
        )}

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button 
            fullWidth
            size="large" 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={!amount || !description || !selectedAccount || loading}
            sx={{ flex: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
          <Button 
            fullWidth
            size="large" 
            variant="outlined" 
            onClick={handleReset}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            Reset
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
