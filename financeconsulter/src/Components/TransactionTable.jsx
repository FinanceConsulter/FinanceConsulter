import { Box, Table, TableBody, TableHead, TableRow, TableCell } from '@mui/material';

function TransactionTable({TableHeader, TableData}){
    return(
        <Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{TableHeader.date}</TableCell>
                        <TableCell>{TableHeader.amount}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {TableData.map(element=>(<TableRow>
                            <TableCell>{element.date}</TableCell>
                            <TableCell>{element.amount}</TableCell>
                        </TableRow>))}
                </TableBody>
            </Table>
        </Box>
    )
}

export default TransactionTable;