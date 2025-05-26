import express from "express";
import Product from "../models/Product.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import { validateProduct } from "../middleware/validation.js";

const router = express.Router();

// Get all products (public)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query based on filters
    let query = { isPublished: true };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Search query
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Featured products
    if (req.query.featured === "true") {
      query.isFeatured = true;
    }

    // Determine sort order
    let sort = {};
    switch (req.query.sort) {
      case "price_asc":
        sort = { price: 1 };
        break;
      case "price_desc":
        sort = { price: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "rating":
        sort = { "rating.average": -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .skip(skip)
      .limit(limit)
      .sort(sort);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// Get product by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Server error fetching product" });
  }
});

// ADMIN ROUTES

// Create product (admin only)
router.post("/", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      images,
      category,
      inventory,
      sku,
      features,
      specifications,
      isFeatured,
      isPublished,
    } = req.body;

    const product = new Product({
      name,
      description,
      price,
      comparePrice,
      images,
      category,
      inventory,
      sku,
      features,
      specifications: specifications
        ? new Map(Object.entries(specifications))
        : undefined,
      isFeatured,
      isPublished,
    });

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Server error creating product" });
  }
});

// Update product (admin only)
router.put("/:id", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      images,
      category,
      inventory,
      sku,
      features,
      specifications,
      isFeatured,
      isPublished,
    } = req.body;

    const updateData = {
      name,
      description,
      price,
      category,
    };

    if (comparePrice !== undefined) updateData.comparePrice = comparePrice;
    if (images) updateData.images = images;
    if (inventory !== undefined) updateData.inventory = inventory;
    if (sku) updateData.sku = sku;
    if (features) updateData.features = features;
    if (specifications)
      updateData.specifications = new Map(Object.entries(specifications));
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error updating product" });
  }
});

// Delete product (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error deleting product" });
  }
});

export default router;
