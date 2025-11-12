import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ShowChart as ShowChartIcon,
  Check as CheckIcon,
  NotificationsOff as NotificationsOffIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { MOCK_AI_INSIGHTS } from '../data/mockAIInsights';

export default function AIInsights() {
  const [insights, setInsights] = useState(MOCK_AI_INSIGHTS.insights);
  const [filter, setFilter] = useState('all'); // 'all', 'good', 'warning', 'alert'

  const healthScore = MOCK_AI_INSIGHTS.health_score;
  const lastAnalyzed = MOCK_AI_INSIGHTS.last_analyzed;

  // Count by severity
  const counts = {
    good: insights.filter(i => i.severity === 'good' && !i.is_resolved).length,
    warning: insights.filter(i => i.severity === 'warning' && !i.is_resolved).length,
    alert: insights.filter(i => i.severity === 'alert' && !i.is_resolved).length
  };

  // Filter insights
  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(i => i.severity === filter);

  const handleResolve = (insightId) => {
    setInsights(prev => prev.map(i => 
      i.id === insightId ? { ...i, is_resolved: true } : i
    ));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'alert': return 'error';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'alert': return '🔴';
      default: return '📊';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getHealthScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <Box>
      {/* Header */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            🤖 AI Financial Insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last analyzed: {lastAnalyzed}
          </Typography>
        </Box>
      </Box>

      {/* Health Score Card */}
      <Card 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          mb: 3,
          overflow: 'hidden'
        }}
      >
        <CardContent>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={2}
          >
            <Box flex={1}>
              <Typography variant="h3" fontWeight={700}>
                {healthScore}/100
              </Typography>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Financial Health Score
              </Typography>
              <Chip 
                label={getHealthScoreLabel(healthScore)} 
                color={getHealthScoreColor(healthScore)}
                size="small" 
              />
            </Box>
            <Box sx={{ fontSize: { xs: '60px', sm: '80px' }, alignSelf: 'center' }}>📈</Box>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={healthScore} 
            sx={{ 
              height: 12, 
              borderRadius: 6, 
              mt: 2,
              bgcolor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white'
              }
            }}
          />
          
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
            You're doing well! Focus on reducing entertainment spending and continue building your emergency fund.
          </Typography>
        </CardContent>
      </Card>

      {/* Category Filter Badges */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2} 
        mb={3}
      >
        <Card 
          sx={{ 
            flex: 1, 
            bgcolor: filter === 'all' ? 'action.selected' : 'background.paper',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            minWidth: { xs: '100%', sm: 'auto' }
          }}
          onClick={() => setFilter('all')}
        >
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>📊</Typography>
            <Typography variant="h5" fontWeight={600}>
              {counts.good + counts.warning + counts.alert}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All Insights
            </Typography>
          </CardContent>
        </Card>

        <Card 
          sx={{ 
            flex: 1, 
            bgcolor: filter === 'good' ? 'success.light' : 'background.paper',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'success.lighter' },
            minWidth: { xs: '100%', sm: 'auto' }
          }}
          onClick={() => setFilter('good')}
        >
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>✅</Typography>
            <Typography variant="h5" fontWeight={600}>
              {counts.good}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Strengths
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            flex: 1, 
            bgcolor: filter === 'warning' ? 'warning.light' : 'background.paper',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'warning.lighter' },
            minWidth: { xs: '100%', sm: 'auto' }
          }}
          onClick={() => setFilter('warning')}
        >
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>⚠️</Typography>
            <Typography variant="h5" fontWeight={600}>
              {counts.warning}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Watch Areas
            </Typography>
          </CardContent>
        </Card>
        
        <Card 
          sx={{ 
            flex: 1, 
            bgcolor: filter === 'alert' ? 'error.light' : 'background.paper',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'error.lighter' },
            minWidth: { xs: '100%', sm: 'auto' }
          }}
          onClick={() => setFilter('alert')}
        >
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h2" sx={{ mb: 1, fontSize: { xs: '2.5rem', sm: '3.75rem' } }}>🔴</Typography>
            <Typography variant="h5" fontWeight={600}>
              {counts.alert}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Urgent Alerts
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Insights List */}
      <Stack spacing={2}>
        {filteredInsights.filter(i => !i.is_resolved).map((insight) => (
          <Card 
            key={insight.id}
            sx={{ 
              borderLeft: '4px solid',
              borderColor: `${getSeverityColor(insight.severity)}.main`,
              opacity: insight.is_resolved ? 0.5 : 1
            }}
          >
            <CardContent>
              {/* Header */}
              <Box 
                display="flex" 
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between" 
                alignItems={{ xs: 'flex-start', sm: 'start' }}
                gap={2}
                mb={2}
              >
                <Box display="flex" gap={2} flex={1} width="100%">
                  <Avatar sx={{ bgcolor: `${getSeverityColor(insight.severity)}.main` }}>
                    {getSeverityIcon(insight.severity)}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="h6" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {insight.category} • Detected {insight.detected_at}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={insight.severity.toUpperCase()} 
                  color={getSeverityColor(insight.severity)}
                  size="small"
                  sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                />
              </Box>

              {/* Description */}
              <Typography variant="body1" sx={{ mb: 2 }}>
                {insight.description}
              </Typography>

              {/* AI Analysis */}
              <Alert severity="info" icon={<TrendingUpIcon />} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  🤖 AI Analysis
                </Typography>
                <Typography variant="body2">
                  {insight.ai_analysis}
                </Typography>
              </Alert>

              {/* Recommendations */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    💡 {insight.recommendations.length} Recommendations
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List disablePadding>
                    {insight.recommendations.map((rec, idx) => (
                      <ListItem key={idx} alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleOutlineIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={<Typography variant="body2" fontWeight={600}>{rec.title}</Typography>}
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary">
                                {rec.description}
                              </Typography>
                              {rec.impact && (
                                <Chip 
                                  label={rec.impact} 
                                  size="small" 
                                  color="success" 
                                  variant="outlined"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              {/* Actions */}
              <Divider sx={{ my: 2 }} />
              <Stack 
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                flexWrap="wrap"
              >
                <Button 
                  size="small" 
                  startIcon={<ShowChartIcon />}
                  onClick={() => alert('View detailed analytics...')}
                  fullWidth={{ xs: true, sm: false }}
                >
                  View Details
                </Button>
                <Button 
                  size="small" 
                  startIcon={<CheckIcon />}
                  color="success"
                  onClick={() => handleResolve(insight.id)}
                  fullWidth={{ xs: true, sm: false }}
                >
                  Mark as Resolved
                </Button>
                <Button 
                  size="small" 
                  startIcon={<NotificationsOffIcon />}
                  onClick={() => alert('Snoozed for 7 days')}
                  fullWidth={{ xs: true, sm: false }}
                >
                  Snooze
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {filteredInsights.filter(i => !i.is_resolved).length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h2" sx={{ mb: 2 }}>🎉</Typography>
              <Typography variant="h6" gutterBottom>
                No {filter !== 'all' && filter} insights to show
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filter === 'all' 
                  ? 'All insights have been resolved!' 
                  : `You have no ${filter} issues at the moment.`}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
