import { Card, CardContent, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Box, Button } from '@mui/material';
import { Receipt, ArrowForward } from '@mui/icons-material';

export default function LatestReceiptsList({ receipts }) {
  if (!receipts || receipts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Latest Receipts</Typography>
          <Typography color="text.secondary">No recent receipts</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Latest Receipts</Typography>
          <Button size="small" endIcon={<ArrowForward />}>
            View all
          </Button>
        </Box>

        <List disablePadding>
          {receipts.map((receipt, idx) => (
            <ListItem
              key={receipt.id}
              divider={idx < receipts.length - 1}
              sx={{ px: 0 }}
            >
              <ListItemAvatar>
                <Avatar>
                  <Receipt />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={receipt.merchant || 'Unknown merchant'}
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(receipt.purchase_date).toLocaleDateString('de-CH')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {receipt.item_count} items
                    </Typography>
                  </Box>
                }
              />
              <Typography variant="body2" fontWeight={600}>
                CHF {(receipt.total_cents / 100).toFixed(2)}
              </Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
