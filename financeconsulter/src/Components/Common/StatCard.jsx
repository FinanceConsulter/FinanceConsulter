import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, // { value: +5.2, direction: 'up' }
  color = 'primary' 
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                backgroundColor: `${color}.lighter`,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
            </Box>
          )}
        </Box>
        
        {trend && (
          <Box display="flex" alignItems="center" mt={2}>
            {trend.direction === 'up' ? (
              <TrendingUp fontSize="small" color="success" />
            ) : (
              <TrendingDown fontSize="small" color="error" />
            )}
            <Typography
              variant="body2"
              color={trend.direction === 'up' ? 'success.main' : 'error.main'}
              sx={{ ml: 0.5 }}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              vs last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}