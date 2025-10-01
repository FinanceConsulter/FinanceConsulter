import { Box, Card, Stack, Typography, TextField,  Button, Divider, Link } from '@mui/material';

export default function Login({ onSubmit, onNavigate }) {
    return (
        <Box>
            <Card>
                <Stack spacing={2}>
                    <Typography variant="h5">Login</Typography>
                    <TextField label="Email" variant="outlined" />
                    <TextField label="Password" type="password" variant="outlined" />
                    <Button variant="contained" onClick={onSubmit}>Login</Button>
                    <Divider />
                    <Link
                        component={"button"}
                        type='button'
                        underline="hover"
                        onClick={() => { onNavigate?.('register'); }}
                    >
                        Don't have an account? Register
                    </Link>
                </Stack>
            </Card>
        </Box>
    );
}
