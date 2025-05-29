import express from "express";
import mongoose from "mongoose";
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

    let query = { isPublished: true };

    if (req.query.category) query.category = req.query.category;
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }
    if (req.query.search) query.$text = { $search: req.query.search };
    if (req.query.featured === "true") query.isFeatured = true;

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
    console.error("Get products error:", error.stack);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// Get product by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error.stack);
    res.status(500).json({ message: "Server error fetching product" });
  }
});

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
    console.error("Create product error:", error.stack);
    res.status(500).json({ message: "Server error creating product" });
  }
});

// Update product (admin only)
router.put("/:id", authenticate, isAdmin, validateProduct, async (req, res) => {
  try {
    const { id } = req.params;
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice;
    if (images) updateData.images = images;
    if (category) updateData.category = category;
    if (inventory !== undefined) updateData.inventory = inventory;
    if (sku) updateData.sku = sku;
    if (features) updateData.features = features;
    if (specifications) {
      if (typeof specifications !== "object") {
        return res
          .status(400)
          .json({ message: "Invalid specifications format" });
      }
      updateData.specifications = new Map(Object.entries(specifications));
    }
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error.stack);
    res.status(500).json({ message: "Server error updating product" });
  }
});

// Delete product (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error.stack);
    res.status(500).json({ message: "Server error deleting product" });
  }
});

export default router;
