import { useState } from 'react';
import {
    Box,
    Card,
    Stack,
    Typography,
    TextField,
    Button,
    Divider,
    Link
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
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                py: { xs: 1.5, md: 3 },
                backgroundColor: '#fff'
            }}
        >
            <Card
                elevation={10}
                sx={{
                    width: '100%',
                    maxWidth: 880,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4c1d95 100%)',
                        color: '#fff',
                        p: { xs: 4, md: 6 },
                        display: { xs: 'none', md: 'flex' },
                        flexDirection: 'column',
                        justifyContent: 'space-between'
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
                </Box>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        p: { xs: 4, md: 6 },
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <Stack spacing={3} sx={{ width: '100%' }}>
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
