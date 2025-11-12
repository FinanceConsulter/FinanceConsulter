import { Box, Table, TableBody, TableHead, TableRow, TableCell, Button, ButtonGroup, TableContainer, Paper, Stack, Typography, Collapse, IconButton, Tabs, Tab, Divider, List, ListItem, ListItemText } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ListAltIcon from '@mui/icons-material/ListAlt';
import EditTransactionDialog from './EditTransactionDialog';

function TransactionTable({ TableHeader, TableData, setCurrentPage = () => {} }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    const [tab, setTab] = useState('grouped');
    const [expanded, setExpanded] = useState(() => new Set());
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

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

    const handleEditClick = (transaction) => {
        setEditingTransaction({
            ...transaction,
            items: (transaction.items || []).map((item, idx) => ({
                id: item.id ?? `temp-${idx}`,
                label: item.label ?? item.name ?? '',
                amount: item.amount ?? item.value ?? '',
                note: item.note ?? ''
            }))
        });
        setEditDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditDialogOpen(false);
        setEditingTransaction(null);
    };

    const handleSaveTransaction = () => {
        setEditDialogOpen(false);
        setEditingTransaction(null);
    };

    const handleAddItem = () => {
        setEditingTransaction(prev => ({
            ...prev,
            items: [
                { id: `new-${Date.now()}`, label: '', amount: '', note: '' },
                ...prev.items
            ]
        }));
    };

    const handleDeleteItem = (itemId) => {
        setEditingTransaction(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== itemId)
        }));
    };

    const handleItemChange = (itemId, field, value) => {
        setEditingTransaction(prev => ({
            ...prev,
            items: prev.items.map(item => 
                item.id === itemId ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleTransactionChange = (field, value) => {
        setEditingTransaction(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const GroupedMobile = () => (
        <Stack spacing={2}>
            {(TableData || []).map((element) => {
                const isOpen = expanded.has(element.id);
                const items = element.items || [];
                return (
                    <Paper 
                        key={element.id} 
                        elevation={2} 
                        sx={{ 
                            p: 2,
                            borderLeft: '4px solid',
                            borderColor: 'primary.main',
                            transition: 'all 0.2s',
                            '&:hover': {
                                elevation: 4,
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>{TableHeader.date}</Typography>
                                <Typography variant="body1" fontWeight={600}>{element.date}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>{TableHeader.amount}</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary.main">{element.amount}</Typography>
                            </Stack>
                            <Divider sx={{ my: 1 }} />
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    onClick={() => handleEditClick(element)}
                                >
                                    Edit
                                </Button>
                                <Button size="small" variant="outlined" color="error">Delete</Button>
                                <Button 
                                    size="small" 
                                    variant="outlined"
                                    startIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />} 
                                    onClick={() => toggleExpand(element.id)}
                                >
                                    Items ({items.length})
                                </Button>
                            </Stack>
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <Divider sx={{ my: 1.5 }} />
                                {items.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                                        No items yet
                                    </Typography>
                                ) : (
                                    <List dense>
                                        {items.map((it, idx) => (
                                            <ListItem 
                                                key={it.id ?? idx} 
                                                sx={{ 
                                                    px: 1,
                                                    py: 1,
                                                    borderRadius: 1,
                                                    '&:hover': { bgcolor: 'action.hover' }
                                                }}
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {it.label ?? it.name ?? `Item ${idx + 1}`}
                                                        </Typography>
                                                    }
                                                    secondary={it.note}
                                                />
                                                <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ ml: 2 }}>
                                                    {it.amount ?? it.value ?? '-'}
                                                </Typography>
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
        <TableContainer component={Paper} elevation={2} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="medium" aria-label="transactions">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell width={48} />
                        <TableCell sx={{ fontWeight: 600 }}>{TableHeader.date}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{TableHeader.amount}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{TableHeader.actions}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(TableData || []).map((element) => {
                        const isOpen = expanded.has(element.id);
                        const items = element.items || [];
                        return (
                            <>
                                <TableRow 
                                    key={`row-${element.id}`} 
                                    hover
                                    sx={{
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <TableCell width={48}>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => toggleExpand(element.id)} 
                                            aria-label={isOpen ? 'collapse' : 'expand'}
                                            color="primary"
                                        >
                                            {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{element.date}</TableCell>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight={700} color="primary.main">
                                            {element.amount}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <ButtonGroup size="small" variant="outlined" aria-label="transaction actions">
                                            <Button onClick={() => handleEditClick(element)}>Edit</Button>
                                            <Button color="error">Delete</Button>
                                        </ButtonGroup>
                                    </TableCell>
                                </TableRow>
                                <TableRow key={`items-${element.id}`}>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
                                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                            <Box sx={{ m: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                                                    📦 Items ({items.length})
                                                </Typography>
                                                {items.length === 0 ? (
                                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                                        No items yet
                                                    </Typography>
                                                ) : (
                                                    <Table size="small" aria-label="items">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>Note</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {items.map((it, idx) => (
                                                                <TableRow 
                                                                    key={it.id ?? idx}
                                                                    sx={{ '&:hover': { bgcolor: 'background.paper' } }}
                                                                >
                                                                    <TableCell sx={{ fontWeight: 500 }}>
                                                                        {it.label ?? it.name ?? `Item ${idx + 1}`}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography variant="body2" fontWeight={600} color="primary.main">
                                                                            {it.amount ?? it.value ?? '-'}
                                                                        </Typography>
                                                                    </TableCell>
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
        <Stack spacing={2}>
            {allItems.length === 0 ? (
                <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ mb: 2 }}>📭</Typography>
                    <Typography variant="body1" color="text.secondary">No items to display</Typography>
                </Paper>
            ) : (
                allItems.map((it) => (
                    <Paper 
                        key={it.id} 
                        elevation={2} 
                        sx={{ 
                            p: 2,
                            borderLeft: '4px solid',
                            borderColor: 'primary.main',
                            transition: 'all 0.2s',
                            '&:hover': {
                                elevation: 4,
                                transform: 'translateY(-2px)'
                            }
                        }}
                    >
                        <Stack spacing={1}>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>Date</Typography>
                            <Typography variant="body1" fontWeight={600}>{it.invoiceDate}</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>Item</Typography>
                            <Typography variant="body1" fontWeight={500}>{it.label}</Typography>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={500}>Amount</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary.main">{it.amount}</Typography>
                            </Stack>
                        </Stack>
                    </Paper>
                ))
            )}
        </Stack>
    );

    const ItemsDesktop = () => (
        <TableContainer component={Paper} elevation={2} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="medium" aria-label="all-items">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {allItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="h2" sx={{ mb: 2 }}>📭</Typography>
                                <Typography variant="body1" color="text.secondary">No items to display</Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        allItems.map((it) => (
                            <TableRow 
                                key={it.id} 
                                hover
                                sx={{
                                    '&:hover': {
                                        bgcolor: 'action.hover'
                                    }
                                }}
                            >
                                <TableCell sx={{ fontWeight: 500 }}>{it.invoiceDate}</TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{it.label}</TableCell>
                                <TableCell>
                                    <Typography variant="body1" fontWeight={700} color="primary.main">
                                        {it.amount}
                                    </Typography>
                                </TableCell>
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

            <EditTransactionDialog
                open={editDialogOpen}
                transaction={editingTransaction}
                onClose={handleCloseDialog}
                onSave={handleSaveTransaction}
                onTransactionChange={handleTransactionChange}
                onItemChange={handleItemChange}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
            />
        </Box>
    );
}

export default TransactionTable;