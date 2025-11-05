import { useState, useEffect } from 'react';
import { Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { useDashboardData } from '../hooks/useDashboardData';

// KPI Cards
import TotalBalanceCard from '../Components/Dashboard/KPICards/TotalBalanceCard';
import MonthSpendCard from '../Components/Dashboard/KPICards/MonthSpendCard';
import BudgetStatusCard from '../Components/Dashboard/KPICards/BudgetStatusCard';
import RecentTransactionsCard from '../Components/Dashboard/KPICards/RecentTransactionsCard';

// Charts
import SpendingBreakdownChart from '../Components/Dashboard/Charts/SpendingBreakdownChart';
import CashflowTimelineChart from '../Components/Dashboard/Charts/CashflowTimelineChart';

// Lists
import LatestTransactionsList from '../Components/Dashboard/Lists/LatestTransactionsList';
import LatestReceiptsList from '../Components/Dashboard/Lists/LatestReceiptsList';

// Insights
import InsightsCard from '../Components/Dashboard/InsightsCard';

export default function Dashboard() {
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'quarter', 'year'
  const { data, loading, error, refetch } = useDashboardData(period);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load dashboard: {error.message}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={600}>
          Welcome back, {data?.user?.first_name || 'User'}
        </Typography>
        {/* Period Filter könnte hier hin */}
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TotalBalanceCard data={data?.summary?.total_balance} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MonthSpendCard data={data?.summary?.month_spend} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BudgetStatusCard data={data?.summary?.budget_status} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <RecentTransactionsCard data={data?.summary?.recent_count} />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <SpendingBreakdownChart data={data?.spending_breakdown} period={period} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CashflowTimelineChart data={data?.cashflow} />
        </Grid>
      </Grid>

      {/* Recent Activity Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <LatestTransactionsList transactions={data?.recent_transactions || []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <LatestReceiptsList receipts={data?.recent_receipts || []} />
        </Grid>
      </Grid>

      {/* Insights */}
      <InsightsCard insights={data?.insights || []} />
    </Box>
  );
}