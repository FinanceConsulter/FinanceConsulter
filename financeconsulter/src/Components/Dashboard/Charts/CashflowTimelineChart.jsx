import { Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CashflowTimelineChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Cashflow Timeline
        </Typography>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const chartData = data.map(item => ({
    month: item.month,
    Income: item.income / 100,
    Expenses: item.expense / 100
  }));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 2 }}>
        Cashflow (Last 6 Months)
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}`}
            />
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
              iconType="line"
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '10px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="Income" 
              stroke="#00C49F" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="Expenses" 
              stroke="#FF8042" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}