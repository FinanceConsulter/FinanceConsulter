import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Divider } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';

// Charts
import SpendingBreakdownChart from '../Components/Dashboard/Charts/SpendingBreakdownChart';
import CashflowTimelineChart from '../Components/Dashboard/Charts/CashflowTimelineChart';

// Lists
import LatestTransactionsList from '../Components/Dashboard/Lists/LatestTransactionsList';

export default function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      // Fetch all required data in parallel
      const [accountsRes, transactionsRes, categoriesRes, userRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/account/', { headers }),
        fetch('http://127.0.0.1:8000/transaction/', { headers }),
        fetch('http://127.0.0.1:8000/category/', { headers }),
        fetch('http://127.0.0.1:8000/user/me', { headers })
      ]);

      if (!accountsRes.ok || !transactionsRes.ok || !categoriesRes.ok || !userRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const accounts = await accountsRes.json();
      const transactionsData = await transactionsRes.json();
      const categoriesData = await categoriesRes.json();
      const user = await userRes.json();

      // Handle empty arrays
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      const categories = Array.isArray(categoriesData) ? categoriesData : [];

      // Calculate KPIs
      // Total Balance: Sum all transactions across all accounts
      const totalBalance = transactions.reduce((sum, t) => sum + (t.amount_cents || 0), 0) / 100;

      // Get current date for period calculations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Month Spend: sum of negative transactions in current month
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfMonth && (t.amount_cents || 0) < 0;
      });
      const monthSpend = Math.abs(monthTransactions.reduce((sum, t) => sum + (t.amount_cents || 0), 0)) / 100;

      // Recent transactions (last 30 days)
      const recentTransactionsFiltered = transactions.filter(t => new Date(t.date) >= last30Days);
      const recentTransactions = recentTransactionsFiltered
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // Show only 5

      // AI Health Status: percentage of transactions with categories
      const transactionsWithCategory = transactions.filter(t => t.category_id !== null).length;
      const aiHealthStatus = transactions.length > 0
        ? Math.round((transactionsWithCategory / transactions.length) * 100)
        : 0;

      // Spending breakdown by category (current month - only negative transactions = expenses)
      const categorySpending = {};
      
      monthTransactions.forEach(t => {
        if (t.category_id) {
          const category = categories.find(c => c.id === t.category_id);
          const categoryName = category?.name || `Category ${t.category_id}`;
          categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs((t.amount_cents || 0));
        }
      });

      const spendingBreakdown = Object.entries(categorySpending).map(([category, amount]) => ({
        category,
        amount: amount
      }));

      // Cashflow data (last 6 months)
      const cashflowData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        const monthTxs = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= monthDate && tDate <= monthEnd;
        });

        // Income: all positive amounts
        const income = monthTxs.filter(t => (t.amount_cents || 0) > 0).reduce((sum, t) => sum + (t.amount_cents || 0), 0) / 100;
        // Expenses: absolute value of all negative amounts
        const expenses = Math.abs(monthTxs.filter(t => (t.amount_cents || 0) < 0).reduce((sum, t) => sum + (t.amount_cents || 0), 0)) / 100;

        cashflowData.push({
          month: monthName,
          Income: parseFloat(income.toFixed(2)),
          Expenses: parseFloat(expenses.toFixed(2))
        });
      }

      // Build final data structure
      const data = {
        user: {
          first_name: user.first_name,
          last_name: user.last_name
        },
        summary: {
          total_balance: totalBalance,
          month_spend: monthSpend,
          budget_status: aiHealthStatus,
          recent_count: recentTransactionsFiltered.length
        },
        spending_breakdown: spendingBreakdown,
        cashflow: cashflowData,
        recent_transactions: recentTransactions,
        accounts: accounts
      };

      setDashboardData(data);
    } catch (err) {
      setError(err);
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // KPI Data
  const totalBalance = typeof dashboardData?.summary?.total_balance === 'number' ? dashboardData.summary.total_balance : 0;
  const monthSpend = typeof dashboardData?.summary?.month_spend === 'number' ? dashboardData.summary.month_spend : 0;
  const aiHealthStatus = typeof dashboardData?.summary?.budget_status === 'number' ? dashboardData.summary.budget_status : 0;
  const recentCount = typeof dashboardData?.summary?.recent_count === 'number' ? dashboardData.summary.recent_count : 0;

  const handleViewAllTransactions = () => {
    if (onNavigate) {
      onNavigate('transactions');
    }
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}
    >
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: { xs: 'calc(100vw - 32px)', sm: 'calc(100vw - 48px)', md: '1200px' },
          p: { xs: 2, sm: 3 },
          pb: { xs: 6, sm: 4 },
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          📊 Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Overview of your financial status
        </Typography>

        {/* Main Card */}
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            {/* KPI Stats Row */}
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: { xs: 2, sm: 3 },
                mb: 3
              }}
            >
              {/* Total Balance */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Total Balance
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  CHF {totalBalance.toFixed(2)}
                </Typography>
              </Box>

              {/* Month Spend */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingDownIcon sx={{ fontSize: 20, color: 'error.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Month Spend
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} color="error.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  CHF {monthSpend.toFixed(2)}
                </Typography>
              </Box>

              {/* AI Health Status */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssessmentIcon sx={{ fontSize: 20, color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    AI Health Status
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  {aiHealthStatus}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Categorized transactions
                </Typography>
              </Box>

              {/* Recent Transactions (Last 30 Days) */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ReceiptIcon sx={{ fontSize: 20, color: 'info.main' }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Recent Activity
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} color="info.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  {recentCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last 30 days
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Charts Section */}
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 300px 1fr' },
                gap: { xs: 3, sm: 3 },
                mb: 3
              }}
            >
              {/* Spending Chart */}
              <Box sx={{ minHeight: { xs: 350, sm: 400, md: 450 } }}>
                <SpendingBreakdownChart data={dashboardData?.spending_breakdown} period="month" />
              </Box>

              {/* Divider mobile only */}
              <Divider sx={{ display: { xs: 'block', lg: 'none' }, my: 3 }} />

              {/* Latest Transactions */}
              <Box 
                sx={{ 
                  height: { xs: 'auto', lg: 'auto' },
                  overflow: 'visible',
                  borderLeft: { xs: 0, lg: 1 },
                  borderRight: { xs: 0, lg: 1 },
                  borderColor: 'divider',
                  px: { xs: 0, lg: 2 }
                }}
              >
                <LatestTransactionsList 
                  transactions={dashboardData?.recent_transactions || []} 
                  accounts={dashboardData?.accounts || []}
                  onViewAll={handleViewAllTransactions}
                />
              </Box>

              {/* Divider mobile only */}
              <Divider sx={{ display: { xs: 'block', lg: 'none' }, my: 3 }} />

              {/* Cashflow Chart */}
              <Box sx={{ minHeight: { xs: 350, sm: 400, md: 450 } }}>
                <CashflowTimelineChart data={dashboardData?.cashflow} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}