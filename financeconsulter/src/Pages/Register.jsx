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
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, md: 8 } }}>
            <Card sx={{ width: '100%', maxWidth: 480, p: { xs: 3, md: 4 } }}>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography variant="h4" fontWeight={600} gutterBottom>
                                Create your account
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Start tracking your finances in minutes.
                            </Typography>
                        </Box>

                        <Stack spacing={2}>
                            <TextField name="email" label="Email" type="email" required fullWidth />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField name="firstName" label="First name" fullWidth />
                                <TextField name="lastName" label="Last name" fullWidth />
                            </Stack>
                            <TextField name="password" label="Password" type="password" required fullWidth helperText="Use at least 8 characters." />
                        </Stack>

                        {error ? (
                            <Typography variant="body2" color="error">
                                {error}
                            </Typography>
                        ) : null}

                        <Button type="submit" variant="contained" size="large" disabled={submitting}>
                            {submitting ? 'Registering…' : 'Register'}
                        </Button>

                        <Divider>Already have an account?</Divider>
                        <Link component="button" type="button" underline="hover" onClick={() => onNavigate?.('login')}>
                            Go to login
                        </Link>
                    </Stack>
                </form>
            </Card>
        </Box>
    );
}