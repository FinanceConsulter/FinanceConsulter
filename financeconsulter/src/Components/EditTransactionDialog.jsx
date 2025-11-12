import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
    IconButton,
    Paper,
    Box,
    Divider,
    useMediaQuery,
    useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

function EditTransactionDialog({ 
    open, 
    transaction, 
    onClose, 
    onSave,
    onTransactionChange,
    onItemChange,
    onAddItem,
    onDeleteItem
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSave = () => {
        console.log('Saving transaction:', transaction);
        // Later API call to update transaction
        alert('Transaction saved! (API integration pending)');
        onSave();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isSmall}
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={600}>
                        ✏️ Edit Transaction
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {transaction && (
                    <Stack spacing={3}>
                        {/* Transaction Details */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Transaction Details
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Date"
                                    value={transaction.date || ''}
                                    onChange={(e) => onTransactionChange('date', e.target.value)}
                                    size="small"
                                />
                                <TextField
                                    fullWidth
                                    label="Amount"
                                    value={transaction.amount || ''}
                                    onChange={(e) => onTransactionChange('amount', e.target.value)}
                                    size="small"
                                />
                            </Stack>
                        </Box>

                        <Divider />

                        {/* Items List */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    📦 Items ({transaction.items?.length || 0})
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={onAddItem}
                                >
                                    Add Item
                                </Button>
                            </Stack>

                            <Stack spacing={2}>
                                {transaction.items?.map((item, idx) => (
                                    <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                    Item {idx + 1}
                                                </Typography>
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => onDeleteItem(item.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                            <TextField
                                                fullWidth
                                                label="Item Name"
                                                value={item.label || ''}
                                                onChange={(e) => onItemChange(item.id, 'label', e.target.value)}
                                                size="small"
                                                placeholder="e.g., Coffee, Bread, etc."
                                            />
                                            <TextField
                                                fullWidth
                                                label="Amount"
                                                value={item.amount || ''}
                                                onChange={(e) => onItemChange(item.id, 'amount', e.target.value)}
                                                size="small"
                                                placeholder="0.00"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Note (Optional)"
                                                value={item.note || ''}
                                                onChange={(e) => onItemChange(item.id, 'note', e.target.value)}
                                                size="small"
                                                multiline
                                                rows={2}
                                                placeholder="Additional notes..."
                                            />
                                        </Stack>
                                    </Paper>
                                ))}

                                {transaction.items?.length === 0 && (
                                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No items yet. Click "Add Item" to create one.
                                        </Typography>
                                    </Paper>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button 
                    onClick={onClose}
                    variant="outlined"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    variant="contained"
                    startIcon={<SaveIcon />}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default EditTransactionDialog;
