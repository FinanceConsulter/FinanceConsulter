import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const DEFAULT_PROFILE = {
  first_name: 'Basti',
  last_name: 'Büeler',
  email: 'bastian.bueeler@example.com',
};

const DEFAULT_FINANCE = {
  defaultAccountType: 'asset',
  defaultAccountCurrency: 'CHF',
  defaultTransactionCurrency: 'CHF',
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'cash', label: 'Cash' },
];

const CURRENCY_OPTIONS = ['CHF', 'EUR', 'USD'];

export default function Settings() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [finance, setFinance] = useState(DEFAULT_FINANCE);

  const handleProfileChange = (field) => (event) => {
    setProfile((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFinanceChange = (field) => (event) => {
    setFinance((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = (section, data) => () => {
    // Hook up API call later
    console.log(`[Settings] ${section}`, data);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">Settings</Typography>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Profile</Typography>
            <Typography variant="body2" color="text.secondary">
              These values map to the <code>users</code> table (first_name, name, email).
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="First name"
              value={profile.first_name}
              onChange={handleProfileChange('first_name')}
            />
            <TextField
              label="Last name"
              value={profile.last_name}
              onChange={handleProfileChange('last_name')}
            />
          </Stack>

          <TextField
            label="Email"
            value={profile.email}
            InputProps={{ readOnly: true }}
            helperText="Email is managed in authentication read only here."
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="contained" onClick={handleSave('profile', profile)}>Save profile</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">Finance defaults</Typography>
            <Typography variant="body2" color="text.secondary">
              Applies to new entries for <code>accounts</code> (type, currency_code) and <code>transactions</code> (currency_code).
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel id="account-type-label">Default account type</InputLabel>
            <Select
              labelId="account-type-label"
              label="Default account type"
              value={finance.defaultAccountType}
              onChange={handleFinanceChange('defaultAccountType')}
            >
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="account-currency-label">Default account currency</InputLabel>
            <Select
              labelId="account-currency-label"
              label="Default account currency"
              value={finance.defaultAccountCurrency}
              onChange={handleFinanceChange('defaultAccountCurrency')}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="transaction-currency-label">Default transaction currency</InputLabel>
            <Select
              labelId="transaction-currency-label"
              label="Default transaction currency"
              value={finance.defaultTransactionCurrency}
              onChange={handleFinanceChange('defaultTransactionCurrency')}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="contained" onClick={handleSave('finance', finance)}>Save finance defaults</Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
