import StatCard from '../../Common/StatCard';
import { AccountBalance } from '@mui/icons-material';

export default function TotalBalanceCard({ data }) {
  if (!data) return null;

  const formattedBalance = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: data.currency || 'CHF'
  }).format(data.total / 100);

  return (
    <StatCard
      title="Total Balance"
      value={formattedBalance}
      subtitle={`across ${data.account_count} accounts`}
      icon={AccountBalance}
      color="primary"
    />
  );
}
