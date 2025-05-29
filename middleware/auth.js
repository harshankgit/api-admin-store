import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware to authenticate JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "your-secret-key";

    // Verify the token
    const decoded = jwt.verify(token, secret);

    // Fetch user details
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid token or user does not exist" });
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    const message =
      error.name === "TokenExpiredError"
        ? "Token has expired"
        : "Invalid token";
    res.status(401).json({ message });
  }
};

// Middleware to check admin role
export const isAdmin = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  res
    .status(403)
    .json({ message: "Access denied. Admin permissions required" });
};

// Middleware to check ownership or admin role
export const isOwnerOrAdmin = (model) => async (req, res, next) => {
  try {
    const resourceId = req.params.id;

    // Fetch the resource
    const resource = await model.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Validate ownership or admin role
    const isOwner =
      resource.user && resource.user.toString() === req.user._id.toString();
    if (isOwner || req.user.role === "admin") {
      return next();
    }

    res.status(403).json({ message: "Access denied. Not authorized" });
  } catch (error) {
    console.error("Authorization error:", error);
    res
      .status(500)
      .json({ message: "Server error during authorization check" });
  }
};
