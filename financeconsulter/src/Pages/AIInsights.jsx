import { useState, useEffect, useCallback } from 'react';
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
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as AutoAwesomeIcon 
} from '@mui/icons-material';

export default function AIInsights() {
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'good', 'warning', 'alert'

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/ai-insights/', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // Check if data is empty (no insights yet)
        if (data && data.health_score !== undefined) {
            setInsightsData(data);
        } else {
            setInsightsData(null); 
        }
      }
    } catch (err) {
      console.error("Failed to load insights", err);
      setError("Could not load insights.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await fetch('http://127.0.0.1:8000/ai-insights/generate', {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setInsightsData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate new insights. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // Helper Functions
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

  if (loading) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
        </Box>
    );
  }

  // View: No Data / Welcome Screen
  if (!insightsData && !generating) {
      return (
        <Container maxWidth="md">
            <Box textAlign="center" py={8}>
                <Typography variant="h3" gutterBottom>🤖 AI Financial Analyst</Typography>
                <Typography variant="h6" color="text.secondary" paragraph>
                    Generate personalized insights based on your recent transactions, categories, and spending habits.
                </Typography>
                <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerate}
                    sx={{ mt: 2, py: 1.5, px: 4, borderRadius: 8 }}
                >
                    Generate Analysis
                </Button>
            </Box>
        </Container>
      );
  }

  // View: Generating
  if (generating) {
      return (
        <Container maxWidth="md">
            <Box textAlign="center" py={10}>
                <CircularProgress size={60} thickness={4} sx={{ mb: 4 }} />
                <Typography variant="h5" gutterBottom>Analyzing your finances...</Typography>
                <Typography color="text.secondary">Currently processing transactions, calculating metrics, and identifying patterns.</Typography>
            </Box>
        </Container>
      );
  }

  // Main Dashboard View
  const { insights, health_score, last_analyzed } = insightsData;

  const counts = {
    good: insights.filter(i => i.severity === 'good' && !i.is_resolved).length,
    warning: insights.filter(i => i.severity === 'warning' && !i.is_resolved).length,
    alert: insights.filter(i => i.severity === 'alert' && !i.is_resolved).length
  };

  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(i => i.severity === filter);

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
            Last analyzed: {new Date(last_analyzed).toLocaleString()}
          </Typography>
        </Box>
        
        <Button 
            variant="contained" 
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={generating}
        >
            {generating ? 'Analyzing...' : 'New Analysis'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

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
                {health_score}/100
              </Typography>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Financial Health Score
              </Typography>
              <Chip 
                label={getHealthScoreLabel(health_score)} 
                color={getHealthScoreColor(health_score)}
                size="small" 
              />
            </Box>
            <Box sx={{ fontSize: { xs: '60px', sm: '80px' }, alignSelf: 'center' }}>📈</Box>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={health_score} 
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
            {insightsData.summary}
          </Typography>
        </CardContent>
      </Card>

      {/* Category Filter Badges */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} 
        gap={2} 
        mb={3}
      >
        {/* All Badge */}
        <Card 
          sx={{ 
            bgcolor: filter === 'all' ? 'action.selected' : 'background.paper',
            cursor: 'pointer',
            border: filter === 'all' ? 1 : 0,
            borderColor: 'primary.main',
          }}
          onClick={() => setFilter('all')}
        >
          <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h2" sx={{ mb: 0.5, fontSize: { xs: '2rem', sm: '3rem' } }}>📊</Typography>
            <Typography variant="h6" fontWeight={700}>
              {counts.good + counts.warning + counts.alert}
            </Typography>
            <Typography variant="caption" color="text.secondary">All Insights</Typography>
          </CardContent>
        </Card>

        {/* Good Badge */}
        <Card 
          sx={{ 
            bgcolor: filter === 'good' ? 'success.light' : 'background.paper',
            cursor: 'pointer',
            border: filter === 'good' ? 1 : 0,
            borderColor: 'success.main',
          }}
          onClick={() => setFilter('good')}
        >
          <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h2" sx={{ mb: 0.5, fontSize: { xs: '2rem', sm: '3rem' } }}>✅</Typography>
            <Typography variant="h6" fontWeight={700}>{counts.good}</Typography>
            <Typography variant="caption" color="text.secondary">Strengths</Typography>
          </CardContent>
        </Card>
        
        {/* Warning Badge */}
        <Card 
           sx={{ 
            bgcolor: filter === 'warning' ? 'warning.light' : 'background.paper',
            cursor: 'pointer',
            border: filter === 'warning' ? 1 : 0,
            borderColor: 'warning.main',
          }}
          onClick={() => setFilter('warning')}
        >
          <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h2" sx={{ mb: 0.5, fontSize: { xs: '2rem', sm: '3rem' } }}>⚠️</Typography>
            <Typography variant="h6" fontWeight={700}>{counts.warning}</Typography>
            <Typography variant="caption" color="text.secondary">Watch Areas</Typography>
          </CardContent>
        </Card>
        
        {/* Alert Badge */}
        <Card 
          sx={{ 
            bgcolor: filter === 'alert' ? 'error.light' : 'background.paper',
            cursor: 'pointer',
            border: filter === 'alert' ? 1 : 0,
            borderColor: 'error.main',
          }}
          onClick={() => setFilter('alert')}
        >
          <CardContent sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
            <Typography variant="h2" sx={{ mb: 0.5, fontSize: { xs: '2rem', sm: '3rem' } }}>🔴</Typography>
            <Typography variant="h6" fontWeight={700}>{counts.alert}</Typography>
            <Typography variant="caption" color="text.secondary">Urgent Alerts</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Insights List */}
      <Stack spacing={2}>
        {filteredInsights.map((insight, idx) => (
          <Card 
            key={insight.id || idx}
            sx={{ 
              borderLeft: '4px solid',
              borderColor: `${getSeverityColor(insight.severity)}.main`,
            }}
          >
            <CardContent>
              {/* Insight Header */}
              <Box 
                display="flex" 
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between" 
                gap={2}
                mb={2}
              >
                <Box display="flex" gap={2}>
                  <Avatar sx={{ bgcolor: `${getSeverityColor(insight.severity)}.main` }}>
                    {getSeverityIcon(insight.severity)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {insight.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {insight.category}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={insight.severity.toUpperCase()} 
                  color={getSeverityColor(insight.severity)}
                  size="small"
                />
              </Box>

              {/* Description */}
              <Typography variant="body1" sx={{ mb: 2 }}>
                {insight.description}
              </Typography>

              {/* AI Analysis Box */}
              <Alert severity="info" icon={<TrendingUpIcon />} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  🤖 AI Analysis
                </Typography>
                <Typography variant="body2">
                  {insight.ai_analysis}
                </Typography>
              </Alert>

              {/* Recommendations */}
              <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="primary">
                    💡 View Recommendations ({insight.recommendations?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0 }}>
                  <List disablePadding>
                    {insight.recommendations?.map((rec, rIdx) => (
                      <ListItem key={rIdx} alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleOutlineIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={<Typography variant="body2" fontWeight={600}>{rec.title}</Typography>}
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'block', my: 0.5 }}>
                                {rec.description}
                              </Typography>
                              {rec.impact && (
                                <Chip label={rec.impact} size="small" color="success" variant="outlined" />
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        ))}

        {filteredInsights.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
               No insights found for this filter.
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}