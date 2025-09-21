import { Box, Table, TableBody, TableHead, TableRow, TableCell, Button, ButtonGroup, TableContainer, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

function TransactionTable({ TableHeader, TableData, setCurrentPage = () => {} }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    if (isSmall) {
        return (
            <Box>
                <Stack spacing={1.5}>
                    {TableData.map((element) => (
                        <Paper key={element.id} elevation={1} sx={{ p: 1.5 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">{TableHeader.date}</Typography>
                                    <Typography variant="body1" fontWeight={500}>{element.date}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">{TableHeader.amount}</Typography>
                                    <Typography variant="body1" fontWeight={500}>{element.amount}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ pt: 0.5, flexWrap: 'wrap' }}>
                                    <Button size="small" variant="contained" onClick={() => setCurrentPage('transactionRead', element.id)}>Read</Button>
                                    <Button size="small" variant="outlined">Update</Button>
                                    <Button size="small" variant="outlined" color="error">Delete</Button>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            </Box>
        );
    }

    // Table with compact rows and horizontal scroll on larger screens
    return (
        <Box>
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" aria-label="transactions">
                    <TableHead>
                        <TableRow>
                            <TableCell>{TableHeader.date}</TableCell>
                            <TableCell>{TableHeader.amount}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{TableHeader.actions}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {TableData.map((element) => (
                            <TableRow key={element.id} hover>
                                <TableCell>{element.date}</TableCell>
                                <TableCell>{element.amount}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    <ButtonGroup size="small" variant="contained" aria-label="transaction actions">
                                        <Button onClick={() => setCurrentPage('transactionRead', element.id)}>Read</Button>
                                        <Button>Update</Button>
                                        <Button color="error">Delete</Button>
                                    </ButtonGroup>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default TransactionTable;