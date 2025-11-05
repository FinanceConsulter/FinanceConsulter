import StatCard from '../../Common/StatCard';
import { Receipt } from '@mui/icons-material';

export default function RecentTransactionsCard({ data }) {
  return (
    <StatCard
      title="Recent Activity"
      value={data?.count || 0}
      subtitle="transactions (last 7 days)"
      icon={Receipt}
      color="info"
    />
  );
}
