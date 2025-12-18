import { useState, useEffect, useCallback } from 'react';
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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; 

export default function QuickEntry() {
  // States
  const [transactionType, setTransactionType] = useState('expense'); // 'income' | 'expense' | 'transfer'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const [selectedAccount, setSelectedAccount] = useState(''); // Quellkonto
  const [targetAccount, setTargetAccount] = useState('');     // Zielkonto
  
  const [selectedTags, setSelectedTags] = useState([]);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [accounts, setAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setDataLoading(true);
      
      // 1. Fetch Accounts
      const accountsRes = await fetch('http://127.0.0.1:8000/account/', { headers: getAuthHeaders() });
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
        if (accountsData.length > 0) setSelectedAccount(accountsData[0].id);
      }
      
      // 2. Fetch Tags
      const tagsRes = await fetch('http://127.0.0.1:8000/tag/', { headers: getAuthHeaders() });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(Array.isArray(tagsData) ? tagsData : []);
      }

      // 3. Fetch Categories (NEU: Damit wir nach "Banktransfer" suchen können)
      const catRes = await fetch('http://127.0.0.1:8000/category/', { headers: getAuthHeaders() });
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (transactionType === 'transfer') {
        if (!targetAccount) {
            setError('Please select a target account for the transfer');
            return;
        }
        if (selectedAccount === targetAccount) {
            setError('Source and target account cannot be the same');
            return;
        }
    }

    try {
      setLoading(true);
      
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      if (transactionType === 'transfer') {
        
        const autoCategory = categories.find(c => 
            c.name.toLowerCase().includes('banktransfer') || 
            c.name.toLowerCase().includes('umbuchung') ||
            c.name.toLowerCase() === 'transfer'
        );
        const transferCategoryId = autoCategory ? autoCategory.id : null;

        const autoTransferTag = tags.find(t => 
            t.name.toLowerCase().includes('transfer') || 
            t.name.toLowerCase().includes('bank') || 
            t.name.toLowerCase().includes('umbuchung')
        );

        let finalTags = [...selectedTags];
        if (autoTransferTag && !finalTags.includes(autoTransferTag.id)) {
            finalTags.push(autoTransferTag.id);
        }
        if (finalTags.length === 0) finalTags = null;

        const sourceAccountData = accounts.find(a => a.id === selectedAccount);
        const targetAccountData = accounts.find(a => a.id === targetAccount);

        const withdrawalPayload = {
            account_id: selectedAccount,
            date: transactionDate,
            description: `Transfer to: ${targetAccountData?.name} - ${description}`,
            amount_cents: -Math.abs(amountInCents), 
            currency_code: sourceAccountData?.currency_code || 'CHF',
            category_id: transferCategoryId, 
            tags: finalTags
        };

        // Deposit Payload
        const depositPayload = {
            account_id: targetAccount,
            date: transactionDate,
            description: `Transfer from: ${sourceAccountData?.name} - ${description}`,
            amount_cents: Math.abs(amountInCents), 
            currency_code: targetAccountData?.currency_code || 'CHF',
            category_id: transferCategoryId, 
            tags: finalTags
        };

        const req1 = fetch('http://127.0.0.1:8000/transaction/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(withdrawalPayload)
        });
        
        const req2 = fetch('http://127.0.0.1:8000/transaction/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(depositPayload)
        });

        const [res1, res2] = await Promise.all([req1, req2]);
        
        if (!res1.ok || !res2.ok) {
            throw new Error('One or both transfer transactions failed');
        }

      } else {
        const finalAmount = transactionType === 'expense' ? -Math.abs(amountInCents) : Math.abs(amountInCents);
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

        const response = await fetch('http://127.0.0.1:8000/transaction/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'Failed to create transaction');
        }
      }

      setSuccess(true);
      setError(null);

      setTimeout(() => {
        handleReset();
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
    setTargetAccount('');
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
        Add income, expenses or transfers manually
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
                  value="transfer"
                  sx={{ 
                    py: 2,
                    '&.Mui-selected': { 
                      bgcolor: 'rgba(33, 150, 243, 0.12)',
                      color: 'primary.dark',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.2)' }
                    }
                  }}
                >
                  <SwapHorizIcon sx={{ mr: 1 }} />
                  TRANSFER
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
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            mr: 1, 
                            color: transactionType === 'income' ? 'success.main' : (transactionType === 'transfer' ? 'primary.main' : 'error.main') 
                        }}
                    >
                      {transactionType === 'income' ? '+' : (transactionType === 'transfer' ? '→' : '-')}
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
              placeholder="e.g., Salary, Rent, Transfer to Savings"
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
            <Stack direction={{ xs: 'column', sm: transactionType === 'transfer' ? 'row' : 'column' }} spacing={2} sx={{ mb: 2 }}>
                <FormControl fullWidth>
                <InputLabel>{transactionType === 'transfer' ? "From Account" : "Account"}</InputLabel>
                <Select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    label={transactionType === 'transfer' ? "From Account" : "Account"}
                    required
                >
                    {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                        {account.name} - {account.currency_code}
                    </MenuItem>
                    ))}
                </Select>
                </FormControl>

                {transactionType === 'transfer' && (
                    <FormControl fullWidth>
                    <InputLabel>To Account</InputLabel>
                    <Select
                        value={targetAccount}
                        onChange={(e) => setTargetAccount(e.target.value)}
                        label="To Account"
                        required
                    >
                        {accounts
                            .filter(acc => acc.id !== selectedAccount)
                            .map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                            {account.name} - {account.currency_code}
                        </MenuItem>
                        ))}
                    </Select>
                    </FormControl>
                )}
            </Stack>

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
                  helperText={transactionType === 'transfer' ? '"Banktransfer" tag and category will be added automatically if available' : ''}
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
              const targetAccountData = accounts.find(acc => acc.id === targetAccount);
              const accountCurrency = selectedAccountData?.currency_code || 'CHF';
              
              let borderColor = 'error.main';
              let bgColor = 'rgba(211, 47, 47, 0.08)';
              let sign = '-';
              
              if (transactionType === 'income') {
                  borderColor = 'success.main';
                  bgColor = 'rgba(46, 125, 50, 0.08)';
                  sign = '+';
              } else if (transactionType === 'transfer') {
                  borderColor = 'primary.main';
                  bgColor = 'rgba(33, 150, 243, 0.08)';
                  sign = ''; 
              }

              // Auto-Detection für Preview
              const autoCategory = categories.find(c => 
                c.name.toLowerCase().includes('banktransfer') || 
                c.name.toLowerCase().includes('umbuchung')
              );
              
              return (
                <Card 
                  variant="outlined" 
                  sx={{ 
                    mt: 3, 
                    borderColor: borderColor,
                    borderWidth: 2,
                    bgcolor: bgColor
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
                             {transactionType === 'transfer' && targetAccountData && (
                                 <span> • {selectedAccountData?.name} ➝ {targetAccountData?.name}</span>
                             )}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="h5" 
                          fontWeight={700}
                          color={borderColor}
                        >
                          {sign}{parseFloat(amount).toFixed(2)} {accountCurrency}
                        </Typography>
                      </Stack>
                    
                    {/* Tags & Category Preview */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                        {selectedTags.map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <Chip 
                              key={tagId} label={tag.name} size="small"
                              sx={{ backgroundColor: tag.color, color: 'white' }}
                            />
                          ) : null;
                        })}
                        {transactionType === 'transfer' && (
                            <>
                                {tags.some(t => t.name.toLowerCase().includes('transfer')) && (
                                     <Chip label="(Auto: Tag Banktransfer)" size="small" variant="outlined" />
                                )}
                                {autoCategory && (
                                     <Chip label={`(Auto: Kat. ${autoCategory.name})`} size="small" variant="outlined" color="primary" />
                                )}
                            </>
                        )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              );
            })()}
          </CardContent>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success">
            {transactionType === 'transfer' ? 'Transfer processed successfully! 💸' : 'Transaction saved successfully! 🎉'}
          </Alert>
        )}

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button 
            fullWidth
            size="large" 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={!amount || !description || !selectedAccount || (transactionType === 'transfer' && !targetAccount) || loading}
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