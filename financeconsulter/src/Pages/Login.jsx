import { useState } from 'react';
import {
    Box,
    Card,
    Stack,
    Typography,
    TextField,
    Button,
    Divider,
    Link,
    FormControlLabel,
    Checkbox
} from '@mui/material';

export default function Login({ onSubmit, onNavigate }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        const data = new FormData(event.currentTarget);
        const payload = {
            email: data.get('email')?.toString().trim(),
            password: data.get('password')?.toString() || '',
            remember: Boolean(data.get('remember'))
        };

        try {
            setSubmitting(true);
            await onSubmit?.(payload);
        } catch (err) {
            setError(err?.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                py: { xs: 6, md: 10 },
                background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #ede9fe 100%)'
            }}
        >
            <Card
                elevation={10}
                sx={{
                    width: '100%',
                    maxWidth: 960,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        flexBasis: { md: '45%' },
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4c1d95 100%)',
                        color: '#fff',
                        p: { xs: 4, md: 6 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}
                >
                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Welcome!
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.85 }}>
                            Sign in to explore THE FINANCE UNIVERSE, manage receipts, and stay ahead of your finances.
                        </Typography>
                    </Box>
                    <Stack spacing={2}>
                        <Stack spacing={1.5}>
                            <Typography variant="body2">• Instant overview of all accounts</Typography>
                            <Typography variant="body2">• AI-assisted receipt management</Typography>
                            <Typography variant="body2">• Personalized spend insights</Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        flexBasis: { md: '55%' },
                        p: { xs: 4, md: 6 }
                    }}
                >
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h4" fontWeight={600} gutterBottom>
                                Log in to FinanceConsulter
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Enter your credentials and jump back into your financial cockpit.
                            </Typography>
                        </Box>

                        <Stack spacing={2}>
                            <TextField name="email" label="Email" type="email" required fullWidth autoComplete="email" />
                            <TextField
                                name="password"
                                label="Password"
                                type="password"
                                required
                                fullWidth
                                autoComplete="current-password"
                            />
                        </Stack>

                        {error ? (
                            <Typography variant="body2" color="error">
                                {error}
                            </Typography>
                        ) : null}

                        <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.25, borderRadius: 2 }}>
                            {submitting ? 'Signing in…' : 'Sign in'}
                        </Button>

                        <Divider>New here?</Divider>
                        <Link component="button" type="button" underline="hover" onClick={() => onNavigate?.('register')}>
                            Create an account
                        </Link>
                    </Stack>
                </Box>
            </Card>
        </Box>
    );
}
