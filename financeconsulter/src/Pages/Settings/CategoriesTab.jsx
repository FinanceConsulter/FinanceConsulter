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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

export default function CategoriesTab({ onSuccess, onError, isMobile }) {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', type: '', parent_id: 0 });
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
        console.log('Categories received from API:', data);
        setCategories(Array.isArray(data) ? data : []);
      } else if (response.status === 200) {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', type: '', parent_id: 0 });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({ 
      name: category.name, 
      type: category.type || '', 
      parent_id: category.parent_id 
    });
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      onError('Category name is required');
      return;
    }

    // Check depth limit (max 10 levels: 0-9)
    if (categoryFormData.parent_id && categoryFormData.parent_id !== 0) {
      const parentDepth = getCategoryDepth(categoryFormData.parent_id);
      if (parentDepth >= 9) {
        onError('Maximum category depth of 10 levels reached. Cannot create subcategories beyond this level.');
        return;
      }
    }

    try {
      const url = 'http://127.0.0.1:8000/category/';
      
      // Clean the data before sending
      const cleanName = categoryFormData.name.trim();
      const cleanType = categoryFormData.type.trim();
      // Convert parent_id: if it's 0 or "0", send null; otherwise send as integer
      let cleanParentId = categoryFormData.parent_id;
      if (cleanParentId === 0 || cleanParentId === "0" || cleanParentId === "" || cleanParentId === null) {
        cleanParentId = null;
      } else {
        cleanParentId = parseInt(cleanParentId, 10);
      }
      
      const body = editingCategory
        ? { 
            id: editingCategory.id, 
            name: cleanName, 
            type: cleanType, 
            parent_id: cleanParentId
          }
        : { 
            name: cleanName, 
            type: cleanType, 
            parent_id: cleanParentId
          };

      console.log('Request body:', body);

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
      setCategoryFormData({ name: '', type: '', parent_id: 0 });
      fetchCategories();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const subcategoryCount = getSubcategoryCount(categoryId);
      
      const response = await fetch(`http://127.0.0.1:8000/category/${categoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      const totalDeleted = subcategoryCount + 1;
      const message = totalDeleted > 1 
        ? `Category and ${subcategoryCount} subcategory(ies) deleted successfully!`
        : 'Category deleted successfully!';
      
      onSuccess(message);
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

  const getAllSubcategories = (categoryId) => {
    const subcategories = categories.filter(cat => cat.parent_id === categoryId);
    return subcategories.flatMap(sub => [sub, ...getAllSubcategories(sub.id)]);
  };

  const getSubcategoryCount = (categoryId) => {
    return getAllSubcategories(categoryId).length;
  };

  // Helper function to get parent category name
  const getParentCategoryName = (parentId) => {
    if (!parentId || parentId === 0) return null;
    const parent = categories.find(cat => cat.id === parentId);
    return parent ? parent.name : null;
  };

  // Helper function to calculate category depth
  const getCategoryDepth = (categoryId) => {
    let depth = 0;
    let currentId = categoryId;
    const maxIterations = 15;
    let iterations = 0;
    
    while (currentId && iterations < maxIterations) {
      const category = categories.find(cat => cat.id === currentId);
      if (!category || !category.parent_id || category.parent_id === 0) {
        break;
      }
      depth++;
      currentId = category.parent_id;
      iterations++;
    }
    
    return depth;
  };

  // Get available parent categories (exclude self, children, and categories at max depth)
  const getAvailableParentCategories = () => {
    const MAX_DEPTH = 9; 
    
    if (!editingCategory) {
      return categories.filter(cat => getCategoryDepth(cat.id) < MAX_DEPTH);
    }
    
    return categories.filter(cat => {
      if (cat.id === editingCategory.id) return false;
      return getCategoryDepth(cat.id) < MAX_DEPTH;
    });
  };

  // Build hierarchical category structure (supports unlimited depth)
  const buildCategoryTree = (maxDepth = 10) => {
    const mainCategories = categories.filter(cat => !cat.parent_id || cat.parent_id === 0);
    const subcategories = categories.filter(cat => cat.parent_id && cat.parent_id !== 0);
    
    const getChildren = (parentId, depth = 0) => {
      if (depth >= maxDepth) return [];
      
      const children = subcategories.filter(cat => cat.parent_id === parentId);
      return children.flatMap(child => [
        { ...child, depth: depth + 1 },
        ...getChildren(child.id, depth + 1)
      ]);
    };
    
    return mainCategories.flatMap(parent => [
      { ...parent, depth: 0 },
      ...getChildren(parent.id, 0)
    ]);
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
            {buildCategoryTree().map((category) => {
              const parentName = getParentCategoryName(category.parent_id);
              const isSubcategory = category.parent_id && category.parent_id !== 0;
              const indentLevel = category.depth || 0;
              
              return (
                <ListItem
                  key={category.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    alignItems: 'flex-start',
                    py: 2,
                    pl: 2 + (indentLevel * 4),
                    pr: 2,
                    position: 'relative'
                  }}
                  secondaryAction={
                    <Stack 
                      direction="row" 
                      spacing={1} 
                      sx={{ 
                        mt: 0.5,
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    >
                      <IconButton edge="end" onClick={() => handleEditCategory(category)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => openDeleteCategoryDialog(category)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        {isSubcategory && (
                          <SubdirectoryArrowRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        )}
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
                      </Stack>
                    }
                    secondary={
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.5 }}>
                        <Chip 
                          label={`Type: ${category.type || 'No type'}`} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ width: 'fit-content', fontSize: '0.75rem' }}
                        />
                        {parentName ? (
                          <Chip 
                            label={`Parent: ${parentName}`} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                            sx={{ width: 'fit-content', fontSize: '0.75rem' }}
                          />
                        ) : (
                          <Chip 
                            label="Main Category" 
                            size="small" 
                            sx={{ 
                              width: 'fit-content', 
                              fontSize: '0.75rem',
                              backgroundColor: '#9c27b0',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: '#7b1fa2'
                              }
                            }}
                          />
                        )}
                      </Stack>
                    }
                    sx={{
                      flex: 1,
                      mr: 10,
                      pr: 10
                    }}
                    primaryTypographyProps={{
                      component: 'div'
                    }}
                    secondaryTypographyProps={{
                      component: 'div'
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>

      {/* Category Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => setCategoryDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{
          paper: {
            sx: {
              m: { xs: 2, sm: 3 },
              maxHeight: { xs: '90vh', sm: '80vh' }
            }
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
              required
              placeholder="e.g., expense, income"
            />

            <FormControl fullWidth>
              <InputLabel>Parent Category (Optional)</InputLabel>
              <Select
                value={categoryFormData.parent_id || 0}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                label="Parent Category (Optional)"
              >
                <MenuItem value={0}>
                  <em>None (Main Category)</em>
                </MenuItem>
                {getAvailableParentCategories().map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          Delete Category
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body1">
              Are you sure you want to delete the category <strong>"{categoryToDelete?.name}"</strong>?
            </Typography>
            
            {categoryToDelete && getSubcategoryCount(categoryToDelete.id) > 0 && (
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: 'warning.lighter',
                  border: '1px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="body2" fontWeight={600} color="warning.dark">
                    ⚠️ Warning: This category has subcategories
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deleting this category will also delete <strong>{getSubcategoryCount(categoryToDelete.id)} subcategory(ies)</strong> under it.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This action cannot be undone.
                  </Typography>
                </Stack>
              </Paper>
            )}
            
            {categoryToDelete && getSubcategoryCount(categoryToDelete.id) === 0 && (
              <Typography variant="body2" color="text.secondary">
                This category has no subcategories. Only this category will be deleted.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteCategoryDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => handleDeleteCategory(categoryToDelete?.id)}
          >
            Delete {categoryToDelete && getSubcategoryCount(categoryToDelete.id) > 0 && `(${getSubcategoryCount(categoryToDelete.id) + 1} total)`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
