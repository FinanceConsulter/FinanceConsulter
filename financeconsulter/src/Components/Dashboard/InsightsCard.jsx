import { Card, CardContent, Typography, Box, Button, Alert } from '@mui/material';
import { Lightbulb, TrendingUp } from '@mui/icons-material';

export default function InsightsCard({ insights }) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Lightbulb color="warning" />
          <Typography variant="h6">AI Insights & Suggestions</Typography>
        </Box>

        {insights.map((insight, idx) => (
          <Alert
            key={idx}
            severity={insight.type || 'info'}
            action={
              insight.action && (
                <Button size="small" color="inherit">
                  {insight.action}
                </Button>
              )
            }
            sx={{ mb: idx < insights.length - 1 ? 2 : 0 }}
          >
            {insight.message}
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}