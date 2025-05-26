import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Authenticate JWT token middleware
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user to request object
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid or user does not exist' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user has admin role
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin permission required' });
  }
};

// Check if user is the owner or an admin
export const isOwnerOrAdmin = (model) => async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const resource = await model.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    // Check if user is owner of the resource
    const isOwner = resource.user && resource.user.toString() === req.user._id.toString();
    
    if (isOwner || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Not authorized' });
    }
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ message: 'Server error during authorization check' });
  }
};