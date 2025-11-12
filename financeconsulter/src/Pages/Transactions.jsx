import { Box, Typography, Stack, Card, CardContent, Chip } from '@mui/material';
import TransactionTable from '../Components/TransactionTable';

export default function Transactions({ header, data, setCurrentPage }) {
  // Calculate some fancy stats :)
  const totalTransactions = data?.length || 0;
  const totalAmount = data?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
  const totalItems = data?.reduce((sum, t) => sum + (t.items?.length || 0), 0) || 0;

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={600} gutterBottom>
        💳 Transactions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View and manage all your transactions
      </Typography>

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
              📦
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Items
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

      {/* Transaction Table */}
      <TransactionTable TableHeader={header} TableData={data} setCurrentPage={setCurrentPage} />
    </Box>
  );
}
