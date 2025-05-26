// Validation middleware for user registration
export const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  if (name.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  
  next();
};

// Validation middleware for user login
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  next();
};

// Validation middleware for product creation/update
export const validateProduct = (req, res, next) => {
  const { name, description, price, category, inventory } = req.body;
  
  if (!name || !description || !price || !category) {
    return res.status(400).json({ message: 'Name, description, price, and category are required' });
  }
  
  if (name.length < 3) {
    return res.status(400).json({ message: 'Product name must be at least 3 characters long' });
  }
  
  if (description.length < 10) {
    return res.status(400).json({ message: 'Description must be at least 10 characters long' });
  }
  
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }
  
  if (inventory !== undefined && (isNaN(inventory) || inventory < 0)) {
    return res.status(400).json({ message: 'Inventory must be a non-negative number' });
  }
  
  next();
};

// Validation middleware for order creation
export const validateOrder = (req, res, next) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }
  
  for (const item of items) {
    if (!item.product || !item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ message: 'Each item must have a valid product ID and positive quantity' });
    }
  }
  
  if (!shippingAddress || !shippingAddress.name || !shippingAddress.street || 
      !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
    return res.status(400).json({ message: 'Complete shipping address is required' });
  }
  
  const validPaymentMethods = ['credit_card', 'paypal', 'bank_transfer'];
  if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ message: 'Valid payment method is required' });
  }
  
  next();
};