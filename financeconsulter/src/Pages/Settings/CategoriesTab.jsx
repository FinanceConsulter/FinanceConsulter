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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';

export default function CategoriesTab({ onSuccess, onError, isMobile }) {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', type: '' });
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch('http://127.0.0.1:8000/category/', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      } else if (response.status === 200) {
        setCategories([]);
      }
    } catch (err) {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', type: '' });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name, type: category.type || '' });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      onError('Category name is required');
      return;
    }

    try {
      const url = 'http://127.0.0.1:8000/category/';
      
      const body = editingCategory
        ? { 
            id: editingCategory.id, 
            name: categoryFormData.name, 
            type: categoryFormData.type || '', 
            parent_id: editingCategory.parent_id || 0 
          }
        : { 
            name: categoryFormData.name, 
            type: categoryFormData.type || '', 
            parent_id: 0 
          };

      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        
        let errorMessage = editingCategory ? 'Unable to update category' : 'Unable to create category';
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

      onSuccess(editingCategory ? 'Category updated!' : 'Category created!');
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', type: '' });
      fetchCategories();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/category/${categoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      onSuccess('Category deleted!');
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      onError(err.message);
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const openDeleteCategoryDialog = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  return (
    <>
      <Stack spacing={3}>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Manage Categories
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and organize categories for your transactions
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateCategory}
            fullWidth={isMobile}
            sx={{ minWidth: { xs: 'auto', sm: 140 } }}
          >
            New Category
          </Button>
        </Box>

        <Divider />

        {categoriesLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <CategoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No categories yet. Create your first category to get started!
            </Typography>
          </Paper>
        ) : (
          <List>
            {Array.isArray(categories) && categories.map((category) => (
              <ListItem
                key={category.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  alignItems: 'flex-start',
                  py: 2
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <IconButton edge="end" onClick={() => handleEditCategory(category)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => openDeleteCategoryDialog(category)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      fontWeight={600}
                      sx={{ 
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        pr: 2
                      }}
                    >
                      {category.name}
                    </Typography>
                  }
                  secondary={category.type || 'No type'}
                  sx={{
                    flex: 1,
                    mr: 8
                  }}
                  primaryTypographyProps={{
                    component: 'div'
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>

      {/* Category Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => setCategoryDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            maxHeight: { xs: '90vh', sm: '80vh' }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </Typography>
          <IconButton edge="end" onClick={() => setCategoryDialogOpen(false)} aria-label="close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Food, Transport, Entertainment"
            />
            <TextField
              label="Type"
              value={categoryFormData.type}
              onChange={(e) => setCategoryFormData(prev => ({ ...prev, type: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Add a type/description for this category..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button onClick={() => setCategoryDialogOpen(false)} fullWidth={isMobile}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategory} fullWidth={isMobile}>
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog 
        open={deleteCategoryDialogOpen} 
        onClose={() => setDeleteCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteCategoryDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handleDeleteCategory(categoryToDelete?.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
