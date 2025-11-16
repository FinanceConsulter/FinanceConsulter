import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Box, Button } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';

export default function LatestTransactionsList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Latest Transactions</Typography>
          <Typography color="text.secondary">No recent transactions</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Latest Transactions</Typography>
          <Button size="small" endIcon={<ArrowForward />}>
            View all
          </Button>
        </Box>

        <List disablePadding>
          {transactions.map((txn, idx) => {
            const amount = txn.amount_cents / 100;
            const isIncome = amount > 0;

            return (
              <ListItem
                key={txn.id}
                divider={idx < transactions.length - 1}
                sx={{ px: 0 }}
              >
                <ListItemText
                  primary={txn.description || 'No description'}
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {new Date(txn.date).toLocaleDateString('de-CH')}
                      </Typography>
                      {txn.category && (
                        <Chip label={txn.category} size="small" variant="outlined" sx={{ ml: 1 }} />
                      )}
                    </>
                  }
                  slotProps={{
                    secondary: {
                      component: 'span'
                    }
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={isIncome ? 'success.main' : 'error.main'}
                >
                  {isIncome ? '+' : ''}CHF {Math.abs(amount).toFixed(2)}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
