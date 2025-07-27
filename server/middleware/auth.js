const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const authHeaderKey = Object.keys(req.headers)
    .find((key) => key.toLowerCase() === 'authorization');
  const authHeader = authHeaderKey ? req.headers[authHeaderKey] : null;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    console.log(`No token provided for request: ${req.url}`);
    return res.status(401).json({ message: 'Không có token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    console.log(`Decoded token for ${req.url}:`, {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    });
    req.user = decoded;
    next();
  } catch (err) {
    console.error(`JWT verification error for ${req.url}:`, err.message);
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    console.log(`Access denied for ${req.url}: No user data`, { user: req.user });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  const userRole = typeof req.user.role === 'string' ? req.user.role.toLowerCase() : null;
  if (!userRole) {
    console.log(`Access denied for ${req.url}: Invalid or missing role`, { user: req.user });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  const allowedRoles = roles.map((role) => (role ? role.toLowerCase() : role));
  if (!allowedRoles.includes(userRole)) {
    console.log(`Access denied for ${req.url}:`, {
      userRole,
      allowedRoles,
      user: req.user,
    });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  console.log(`Authorized for ${req.url}:`, { user: req.user });
  next();
};