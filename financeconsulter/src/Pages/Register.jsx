import { useState } from 'react';
import { Box, Card, Stack, Typography, TextField, Button, Divider, Link } from '@mui/material';

export default function Register({ onSubmit, onNavigate }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        const data = new FormData(event.currentTarget);
        const payload = {
            email: data.get('email')?.toString().trim(),
            password: data.get('password')?.toString() || '',
            first_name: data.get('firstName')?.toString().trim() || null,
            last_name: data.get('lastName')?.toString().trim() || null,
        };

        try {
            setSubmitting(true);
            await onSubmit?.(payload);
        } catch (err) {
            setError(err?.message || 'Registration failed');
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
                            Join FinanceConsulter
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.85 }}>
                            Create your account to unlock real-time insights, receipt automation, and smarter planning.
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
                                Create your account
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Start tracking your finances in minutes.
                            </Typography>
                        </Box>

                        <Stack spacing={2}>
                            <TextField name="email" label="Email" type="email" required fullWidth autoComplete="email" />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField name="firstName" label="First name" fullWidth autoComplete="given-name" />
                                <TextField name="lastName" label="Last name" fullWidth autoComplete="family-name" />
                            </Stack>
                            <TextField
                                name="password"
                                label="Password"
                                type="password"
                                required
                                fullWidth
                                autoComplete="new-password"
                                helperText="Use at least 8 characters."
                            />
                        </Stack>

                        {error ? (
                            <Typography variant="body2" color="error">
                                {error}
                            </Typography>
                        ) : null}

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={submitting}
                            sx={{ py: 1.25, borderRadius: 2 }}
                        >
                            {submitting ? 'Registering…' : 'Register'}
                        </Button>

                        <Divider>Already have an account?</Divider>
                        <Link component="button" type="button" underline="hover" onClick={() => onNavigate?.('login')}>
                            Go to login
                        </Link>
                    </Stack>
                </Box>
            </Card>
        </Box>
    );
}