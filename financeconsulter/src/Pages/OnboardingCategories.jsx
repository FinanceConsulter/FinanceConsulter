import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export default function OnboardingCategories({ onDone }) {
  const [mode, setMode] = useState('standard');
  const [behavior, setBehavior] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [warning, setWarning] = useState(null);

  const canSubmit = useMemo(() => {
    if (mode === 'standard') return true;
    return behavior.trim().length > 0;
  }, [mode, behavior]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      setWarning(null);

      const payload = {
        mode,
        behavior: mode === 'ai' ? behavior.trim() : null,
      };

      const res = await fetch('http://127.0.0.1:8000/category/onboarding', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || 'Failed to create categories');
      }

      const data = await res.json();
      setSuccess(`Created ${data?.created ?? 0} categories/subcategories.`);
      if (data?.warning) setWarning(data.warning);

      // proceed
      onDone?.();
    } catch (e) {
      setError(e?.message || 'Failed to create categories');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Category setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start with standard categories, optionally add AI-based extras.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <FormControl>
                <RadioGroup
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <FormControlLabel
                    value="standard"
                    control={<Radio />}
                    label="Use standard categories & subcategories"
                  />
                  <FormControlLabel
                    value="ai"
                    control={<Radio />}
                    label="Standard + describe my shopping behavior (AI add-on)"
                  />
                </RadioGroup>
              </FormControl>

              {mode === 'ai' ? (
                <TextField
                  label="Shopping behavior"
                  placeholder="e.g. I shop mostly at Coop/Migros, use SBB often, eat out on weekends, travel 2-3x per year…"
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                  helperText="Write at least one sentence to enable Continue."
                />
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}
              {warning ? <Alert severity="warning">{warning}</Alert> : null}
              {success ? <Alert severity="success">{success}</Alert> : null}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? 'Creating…' : 'Continue'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
