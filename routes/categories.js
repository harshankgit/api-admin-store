import express from 'express';
import mongoose from 'mongoose';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Define Category schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  image: String,
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug');
    
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// Get category by ID or slug (public)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category;
    
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      category = await Category.findById(idOrSlug).populate('parent', 'name slug');
    } else {
      category = await Category.findOne({ slug: idOrSlug }).populate('parent', 'name slug');
    }
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error fetching category' });
  }
});

// ADMIN ROUTES

// Create category (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, image, parent, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }
    
    const category = new Category({
      name,
      slug,
      description,
      image,
      parent,
      isActive
    });
    
    const savedCategory = await category.save();
    
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, image, parent, isActive } = req.body;
    const updateData = {};
    
    if (name) {
      updateData.name = name;
      // Update slug if name changes
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if new slug already exists (excluding this category)
      const existingCategory = await Category.findOne({
        slug: updateData.slug,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({ message: 'Category with this name already exists' });
      }
    }
    
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parent !== undefined) updateData.parent = parent || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Check if category has products
    const Product = mongoose.model('Product');
    const hasProducts = await Product.exists({ category: req.params.id });
    
    if (hasProducts) {
      return res.status(400).json({
        message: 'Cannot delete category that has products. Update or delete the products first.'
      });
    }
    
    // Check if category has subcategories
    const hasSubcategories = await Category.exists({ parent: req.params.id });
    
    if (hasSubcategories) {
      return res.status(400).json({
        message: 'Cannot delete category that has subcategories. Delete or reassign the subcategories first.'
      });
    }
    
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
});

export default router;