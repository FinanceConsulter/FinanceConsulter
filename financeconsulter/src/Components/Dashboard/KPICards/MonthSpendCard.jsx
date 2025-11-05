import StatCard from '../../Common/StatCard';
import { TrendingDown } from '@mui/icons-material';

export default function MonthSpendCard({ data }) {
  if (!data) return null;

  const formattedSpend = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: data.currency || 'CHF'
  }).format(Math.abs(data.total) / 100);

  return (
    <StatCard
      title="This Month"
      value={formattedSpend}
      subtitle="total spending"
      icon={TrendingDown}
      trend={data.trend}
      color="error"
    />
  );
}