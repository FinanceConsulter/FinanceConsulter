import { Box, Card, Stack, Typography, TextField, Checkbox,
         FormControlLabel, Button, Divider, Link } from '@mui/material';

export default function Register({ onSubmit }) {
    return (
        <Box>
            <Card>
                <Stack spacing={2}>
                    <Typography variant="h5">Register</Typography>
                    <TextField label="Email" variant="outlined" />
                    <TextField label="Password" type="password" variant="outlined" />
                    <Button variant="contained" onClick={onSubmit}>Register</Button>
                    <Divider />
                </Stack>
            </Card>
        </Box>
    );
}