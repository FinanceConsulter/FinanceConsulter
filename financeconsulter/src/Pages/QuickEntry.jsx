import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography, TextField, ToggleButtonGroup, ToggleButton, Alert } from '@mui/material';
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
  const [category, setCategory] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    
    if (!amount || parseFloat(amount) === 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    const transactionData = {
      type: transactionType,
      amount: parseFloat(amount),
      description: description.trim(),
      category: category.trim() || 'Other',
      date: new Date().toISOString()
    };

    console.log('Quick Entry Transaction:', transactionData);
    

    // Success feedback
    setSuccess(true);
    setError(null);

    // Reset form
    setTimeout(() => {
      setAmount('');
      setDescription('');
      setCategory('');
      setSuccess(false);
    }, 2000);
  };

  const handleReset = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setError(null);
    setSuccess(false);
  };

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

            {/* Preview Card */}
            {amount && description && (
              <Card 
                variant="outlined" 
                sx={{ 
                  mt: 3, 
                  borderColor: transactionType === 'income' ? 'success.main' : 'error.main',
                  borderWidth: 2,
                  bgcolor: transactionType === 'income' ? 'success.lighter' : 'error.lighter'
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preview
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {category || 'Other'}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {description}
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h5" 
                      fontWeight={700}
                      color={transactionType === 'income' ? 'success.main' : 'error.main'}
                    >
                      {transactionType === 'income' ? '+' : '-'}{amount}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button 
            fullWidth={isMobile}
            size="large" 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={!amount || !description}
            sx={{ flex: 1 }}
          >
            Save Transaction
          </Button>
          <Button 
            fullWidth={isMobile}
            size="large" 
            variant="outlined" 
            onClick={handleReset}
          >
            Reset
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
