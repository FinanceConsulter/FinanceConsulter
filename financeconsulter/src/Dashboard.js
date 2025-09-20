// src/Dashboard.js
import { Box, Typography, Card, CardContent } from '@mui/material';

function Dashboard() {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6">Kunden</Typography>
                        <Typography variant="h3">124</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6">Beratungen</Typography>
                        <Typography variant="h3">45</Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6">Umsatz</Typography>
                        <Typography variant="h3">€25,400</Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}

export default Dashboard;