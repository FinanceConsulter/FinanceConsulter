import { Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SpendingBreakdownChart({ data, period }) {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Spending by Category
        </Typography>
        <Typography color="text.secondary">No data for this period</Typography>
      </Box>
    );
  }

  const chartData = data.map(item => ({
    name: item.category,
    value: item.amount / 100,
    percent: item.percent
  }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Spending by Category
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          For {period}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              fill="#8884d8"
              dataKey="value"
              label={false}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `CHF ${value.toFixed(2)}`}
              contentStyle={{ 
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '10px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}