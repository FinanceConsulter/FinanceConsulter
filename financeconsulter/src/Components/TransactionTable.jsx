import { Box, Table, TableBody, TableHead, TableRow, TableCell, Button, ButtonGroup } from '@mui/material';

function TransactionTable({ TableHeader, TableData }) {
    return (
        <Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{TableHeader.date}</TableCell>
                        <TableCell>{TableHeader.amount}</TableCell>
                        <TableCell>{TableHeader.actions}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {TableData.map(element => (
                        <TableRow>
                            <TableCell>{element.date}</TableCell>
                            <TableCell>{element.amount}</TableCell>
                            <TableCell>
                                <ButtonGroup variant="contained" aria-label="Basic button group">
                                    <Button onClick={() => setCurrentPage('transactionRead', element.id)}>Read</Button>
                                    <Button>Update</Button>
                                    <Button>Delete</Button>
                                </ButtonGroup>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    )
}

export default TransactionTable;