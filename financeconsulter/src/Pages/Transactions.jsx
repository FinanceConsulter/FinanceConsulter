import { Box, Typography } from '@mui/material';
import TransactionTable from '../Components/TransactionTable';

export default function Transactions({ header, data, setCurrentPage }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Transactions</Typography>
      <TransactionTable TableHeader={header} TableData={data} setCurrentPage={setCurrentPage} />
    </Box>
  );
}
