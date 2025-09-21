import { Box, Table, TableBody, TableHead, TableRow, TableCell, Button, ButtonGroup, TableContainer, Paper, Stack, Typography, Collapse, IconButton, Tabs, Tab, Divider, List, ListItem, ListItemText } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ListAltIcon from '@mui/icons-material/ListAlt';

function TransactionTable({ TableHeader, TableData, setCurrentPage = () => {} }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    const [tab, setTab] = useState('grouped');
    const [expanded, setExpanded] = useState(() => new Set());

    const allItems = useMemo(() => {
        const out = [];
        (TableData || []).forEach((inv) => {
            const items = inv.items || [];
            items.forEach((it, idx) => {
                out.push({
                    id: it.id ?? `${inv.id}-${idx}`,
                    label: it.label ?? it.name ?? `Item ${idx + 1}`,
                    amount: it.amount ?? it.value ?? '-',
                    invoiceId: inv.id,
                    invoiceDate: inv.date,
                });
            });
        });
        return out;
    }, [TableData]);

    const toggleExpand = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const GroupedMobile = () => (
        <Stack spacing={1.5}>
            {(TableData || []).map((element) => {
                const isOpen = expanded.has(element.id);
                const items = element.items || [];
                return (
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
                                <Button size="small" startIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => toggleExpand(element.id)}>
                                    {isOpen ? 'Hide items' : 'Show items'}
                                </Button>
                            </Stack>
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <Divider sx={{ my: 1 }} />
                                {items.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">No items yet</Typography>
                                ) : (
                                    <List dense>
                                        {items.map((it, idx) => (
                                            <ListItem key={it.id ?? idx} sx={{ px: 0 }}>
                                                <ListItemText
                                                    primary={it.label ?? it.name ?? `Item ${idx + 1}`}
                                                    secondary={it.note}
                                                />
                                                <Typography variant="body2" fontWeight={500} sx={{ ml: 2 }}>{it.amount ?? it.value ?? '-'}</Typography>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Collapse>
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );

    const GroupedDesktop = () => (
        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" aria-label="transactions">
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell>{TableHeader.date}</TableCell>
                        <TableCell>{TableHeader.amount}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{TableHeader.actions}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(TableData || []).map((element) => {
                        const isOpen = expanded.has(element.id);
                        const items = element.items || [];
                        return (
                            <>
                                <TableRow key={`row-${element.id}`} hover>
                                    <TableCell width={48}>
                                        <IconButton size="small" onClick={() => toggleExpand(element.id)} aria-label={isOpen ? 'collapse' : 'expand'}>
                                            {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </TableCell>
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
                                <TableRow key={`items-${element.id}`}>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                            <Box sx={{ m: 1 }}>
                                                <Typography variant="subtitle2" gutterBottom>Items</Typography>
                                                {items.length === 0 ? (
                                                    <Typography variant="body2" color="text.secondary">No items yet</Typography>
                                                ) : (
                                                    <Table size="small" aria-label="items">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Item</TableCell>
                                                                <TableCell>Amount</TableCell>
                                                                <TableCell>Note</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {items.map((it, idx) => (
                                                                <TableRow key={it.id ?? idx}>
                                                                    <TableCell>{it.label ?? it.name ?? `Item ${idx + 1}`}</TableCell>
                                                                    <TableCell>{it.amount ?? it.value ?? '-'}</TableCell>
                                                                    <TableCell>{it.note ?? ''}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const ItemsMobile = () => (
        <Stack spacing={1.5}>
            {allItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No items to display</Typography>
            ) : (
                allItems.map((it) => (
                    <Paper key={it.id} elevation={1} sx={{ p: 1.5 }}>
                        <Stack spacing={0.5}>
                            <Typography variant="body2" color="text.secondary">Date</Typography>
                            <Typography variant="body1" fontWeight={500}>{it.invoiceDate}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>Item</Typography>
                            <Typography variant="body1">{it.label}</Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
                                <Typography variant="body2" color="text.secondary">Amount</Typography>
                                <Typography variant="body1" fontWeight={500}>{it.amount}</Typography>
                            </Stack>
                        </Stack>
                    </Paper>
                ))
            )}
        </Stack>
    );

    const ItemsDesktop = () => (
        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" aria-label="all-items">
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Amount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {allItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3}>
                                <Typography variant="body2" color="text.secondary">No items to display</Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        allItems.map((it) => (
                            <TableRow key={it.id} hover>
                                <TableCell>{it.invoiceDate}</TableCell>
                                <TableCell>{it.label}</TableCell>
                                <TableCell>{it.amount}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Box>
            <Paper elevation={0} sx={{ mb: 2, bgcolor: 'transparent' }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant={isSmall ? 'fullWidth' : 'standard'}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value="grouped" icon={<ReceiptLongIcon fontSize="small" />} iconPosition="start" label="Transactions" />
                    <Tab value="items" icon={<ListAltIcon fontSize="small" />} iconPosition="start" label="All items" />
                </Tabs>
            </Paper>

            {tab === 'grouped' ? (
                isSmall ? <GroupedMobile /> : <GroupedDesktop />
            ) : (
                isSmall ? <ItemsMobile /> : <ItemsDesktop />
            )}
        </Box>
    );
}

export default TransactionTable;