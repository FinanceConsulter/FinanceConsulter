import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
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
  useMediaQuery,
  useTheme,
  Snackbar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Settings() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    first_name: '',
    last_name: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Tags state
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagFormData, setTagFormData] = useState({ name: '', color: '#1976d2' });
  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);

  // Categories state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', type: '' });
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Load user data on mount
  useEffect(() => {
    fetchUserData();
    fetchTags();
    fetchCategories();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/user/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load user data');
      }

      const userData = await response.json();
      setUser(userData);
      setProfileData({
        email: userData.email || '',
        name: userData.name || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field) => (event) => {
    setProfileData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://127.0.0.1:8000/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      await fetchUserData(); // Reload user data
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://127.0.0.1:8000/user/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // ========== TAGS FUNCTIONS ==========
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
        // Empty list
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
    setError(null);
    setSuccess(null);

    if (!tagFormData.name.trim()) {
      setError('Tag name is required');
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
        
        // Parse error message to make it user-friendly
        let errorMessage = editingTag ? 'Unable to update tag' : 'Unable to create tag';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.detail) {
            // Remove JSON formatting from error message
            errorMessage = errorJson.detail.replace(/[{}"]/g, '');
          }
        } catch {
          // If not JSON, use the raw error
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      setSuccess(editingTag ? 'Tag updated!' : 'Tag created!');
      setTagDialogOpen(false);
      fetchTags();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTag = async (tagId) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/tag/${tagId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      setSuccess('Tag deleted!');
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
      fetchTags();
    } catch (err) {
      setError(err.message);
      setDeleteTagDialogOpen(false);
      setTagToDelete(null);
    }
  };

  const openDeleteTagDialog = (tag) => {
    setTagToDelete(tag);
    setDeleteTagDialogOpen(true);
  };

  // ========== CATEGORIES FUNCTIONS ==========
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
    setError(null);
    setSuccess(null);

    if (!categoryFormData.name.trim()) {
      setError('Category name is required');
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
        
        // Parse error message to make it user-friendly
        let errorMessage = editingCategory ? 'Unable to update category' : 'Unable to create category';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.detail) {
            // Remove JSON formatting from error message
            errorMessage = errorJson.detail.replace(/[{}"]/g, '');
          }
        } catch {
          // If not JSON, use the raw error
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      setSuccess(editingCategory ? 'Category updated!' : 'Category created!');
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', type: '' });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/category/${categoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      setSuccess('Category deleted!');
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      setError(err.message);
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const openDeleteCategoryDialog = (category) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account settings and preferences
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{
              minHeight: { xs: 56, sm: 64 },
              '& .MuiTab-root': {
                minHeight: { xs: 56, sm: 64 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 80, sm: 120 },
                px: { xs: 1, sm: 2 },
                '& .MuiTab-iconWrapper': {
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  marginRight: { xs: 0.5, sm: 1 }
                }
              }
            }}
          >
            <Tab 
              label={isMobile ? '' : 'Profile'} 
              icon={<PersonIcon />} 
              iconPosition="start"
              aria-label="Profile"
            />
            <Tab 
              label={isMobile ? '' : 'Security'} 
              icon={<LockIcon />} 
              iconPosition="start"
              aria-label="Security"
            />
            <Tab 
              label={isMobile ? '' : 'Tags'} 
              icon={<LabelIcon />} 
              iconPosition="start"
              aria-label="Tags"
            />
            <Tab 
              label={isMobile ? '' : 'Categories'} 
              icon={<CategoryIcon />} 
              iconPosition="start"
              aria-label="Categories"
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Profile Tab */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your personal details
                </Typography>
              </Box>

              <Divider />

              <TextField
                label="Email"
                value={profileData.email}
                onChange={handleProfileChange('email')}
                fullWidth
                type="email"
                helperText="Your email address for login"
              />

              <TextField
                label="Display Name"
                value={profileData.name}
                onChange={handleProfileChange('name')}
                fullWidth
                helperText="This is how you'll appear in the system"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First Name"
                  value={profileData.first_name}
                  onChange={handleProfileChange('first_name')}
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={handleProfileChange('last_name')}
                  fullWidth
                />
              </Stack>

              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
                <Button variant="outlined" onClick={fetchUserData} fullWidth={isMobile}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSaveProfile} fullWidth={isMobile}>
                  Save Changes
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your password to keep your account secure
                </Typography>
              </Box>

              <Divider />

              <TextField
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange('currentPassword')}
                fullWidth
                autoComplete="current-password"
              />

              <TextField
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange('newPassword')}
                fullWidth
                autoComplete="new-password"
                helperText="Must be at least 8 characters"
              />

              <TextField
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange('confirmPassword')}
                fullWidth
                autoComplete="new-password"
              />

              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
                <Button 
                  variant="outlined" 
                  onClick={() => setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })}
                  fullWidth={isMobile}
                >
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleChangePassword} fullWidth={isMobile}>
                  Change Password
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* Tags Tab */}
          <TabPanel value={tabValue} index={2}>
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
          </TabPanel>

          {/* Categories Tab */}
          <TabPanel value={tabValue} index={3}>
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
          </TabPanel>
        </CardContent>
      </Card>

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
                  '#1976d2', 
                  '#0288d1', 
                  '#0097a7', 
                  '#00897b', 
                  '#388e3c', 
                  '#689f38', 
                  '#afb42b', 
                  '#fbc02d', 
                  '#ffa000', 
                  '#f57c00', 
                  '#e64a19', 
                  '#d32f2f', 
                  '#c2185b', 
                  '#7b1fa2', 
                  '#512da8', 
                  '#303f9f', 
                  '#455a64', 
                  '#5d4037', 
                  '#616161', 
                  '#37474f', 
                  '#00d0ffff', 
                  '#00ff15ff', 
                  '#ff00d9ff',
                  '#f9a825', 
                  '#ff0000ff', 
                  '#240512ff', 
                  '#42421aff',
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
                      '&:hover': { 
                        opacity: 0.8
                      }
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

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="filled"
          icon={<ErrorIcon />}
          sx={{ width: '100%', maxWidth: '500px' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess(null)} 
          severity="success" 
          variant="filled"
          icon={<CheckCircleIcon />}
          sx={{ width: '100%', maxWidth: '500px' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
