import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';

export default function BudgetStatusCard({ data }) {
  if (!data) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="text.secondary" variant="subtitle2">
            Budget Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No budgets set
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const percentage = (data.spent / data.limit) * 100;
  const isOverBudget = percentage > 100;
  const isWarning = percentage > 80 && percentage <= 100;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography color="text.secondary" variant="subtitle2">
            Budget Status
          </Typography>
          {isOverBudget ? (
            <Warning color="error" />
          ) : isWarning ? (
            <Warning color="warning" />
          ) : (
            <CheckCircle color="success" />
          )}
        </Box>

        <Typography variant="h4" fontWeight={600}>
          {percentage.toFixed(0)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          of monthly budget
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          color={isOverBudget ? 'error' : isWarning ? 'warning' : 'success'}
          sx={{ mt: 2, height: 8, borderRadius: 4 }}
        />

        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="caption" color="text.secondary">
            CHF {(data.spent / 100).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            CHF {(data.limit / 100).toFixed(2)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
