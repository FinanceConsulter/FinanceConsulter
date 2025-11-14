import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import CloseIcon from '@mui/icons-material/Close';

export default function TagsTab({ onSuccess, onError, isMobile }) {
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagFormData, setTagFormData] = useState({ name: '', color: '#1976d2' });
  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchTags = async () => {
    try {
      setTagsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/tag/', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setTags(Array.isArray(data) ? data : []);
      } else if (response.status === 200) {
        setTags([]);
      }
    } catch (err) {
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  const handleCreateTag = () => {
    setEditingTag(null);
    setTagFormData({ name: '', color: '#1976d2' });
    setTagDialogOpen(true);
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setTagFormData({ name: tag.name, color: tag.color || '#1976d2' });
    setTagDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagFormData.name.trim()) {
      onError('Tag name is required');
      return;
    }

    try {
      const url = 'http://127.0.0.1:8000/tag/';
      
      const body = editingTag
        ? { id: editingTag.id, name: tagFormData.name, color: tagFormData.color }
        : { name: tagFormData.name, color: tagFormData.color };

      const response = await fetch(url, {
        method: editingTag ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        let errorMessage = editingTag ? 'Unable to update tag' : 'Unable to create tag';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.detail) {
            errorMessage = errorJson.detail.replace(/[{}"]/g, '');
          }
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      onSuccess(editingTag ? 'Tag updated!' : 'Tag created!');
      setTagDialogOpen(false);
      setEditingTag(null);
      setTagFormData({ name: '', color: '#1976d2' });
      fetchTags();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDeleteTag = async (tagId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/tag/${tagId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      onSuccess('Tag deleted!');
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
      fetchTags();
    } catch (err) {
      onError(err.message);
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const openDeleteTagDialog = (tag) => {
    setTagToDelete(tag);
    setDeleteTagDialogOpen(true);
  };

  return (
    <>
      <Stack spacing={3}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Manage Tags
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and organize tags for your transactions
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateTag}
            fullWidth={isMobile}
            sx={{ minWidth: { xs: 'auto', sm: 120 } }}
          >
            New Tag
          </Button>
        </Box>

        <Divider />

        {tagsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : tags.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <LabelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No tags yet. Create your first tag to get started!
            </Typography>
          </Paper>
        ) : (
          <List>
            {Array.isArray(tags) && tags.map((tag) => (
              <ListItem
                key={tag.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1}>
                    <IconButton edge="end" onClick={() => handleEditTag(tag)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => openDeleteTagDialog(tag)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip 
                        label={tag.name} 
                        size="small"
                        sx={{ 
                          bgcolor: tag.color || '#1976d2',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>

      {/* Tag Dialog */}
      <Dialog 
        open={tagDialogOpen} 
        onClose={() => setTagDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 2 },
            maxHeight: { xs: '90vh', sm: '80vh' }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {editingTag ? 'Edit Tag' : 'Create New Tag'}
          </Typography>
          <IconButton edge="end" onClick={() => setTagDialogOpen(false)} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Tag Name"
              value={tagFormData.name}
              onChange={(e) => setTagFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Work, Personal, Urgent"
            />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                Tag Color
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: {
                  xs: 'repeat(7, 1fr)',
                  sm: 'repeat(auto-fill, minmax(50px, 1fr))'
                },
                gap: { xs: 1.5, sm: 1.5 },
                width: '100%',
                maxHeight: { xs: '240px', sm: 'none' },
                overflowY: { xs: 'auto', sm: 'visible' }
              }}>
                {[
                  '#1976d2', '#0288d1', '#0097a7', '#00897b', '#388e3c', '#689f38', '#afb42b', 
                  '#fbc02d', '#ffa000', '#f57c00', '#e64a19', '#d32f2f', '#c2185b', '#7b1fa2', 
                  '#512da8', '#303f9f', '#455a64', '#5d4037', '#616161', '#37474f', '#00d0ffff', 
                  '#00ff15ff', '#ff00d9ff', '#f9a825', '#ff0000ff', '#240512ff', '#42421aff',
                ].map(color => (
                  <Box
                    key={color}
                    onClick={() => setTagFormData(prev => ({ ...prev, color }))}
                    sx={{
                      aspectRatio: '1',
                      bgcolor: color,
                      borderRadius: { xs: 0.75, sm: 1 },
                      cursor: 'pointer',
                      outline: tagFormData.color === color ? '3px solid' : 'none',
                      outlineColor: 'primary.main',
                      outlineOffset: '-3px',
                      transition: 'all 0.2s',
                      '&:hover': { opacity: 0.8 }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button onClick={() => setTagDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTag} fullWidth={isMobile}>
            {editingTag ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Tag Confirmation Dialog */}
      <Dialog 
        open={deleteTagDialogOpen} 
        onClose={() => setDeleteTagDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Tag</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the tag "{tagToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTagDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handleDeleteTag(tagToDelete?.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
