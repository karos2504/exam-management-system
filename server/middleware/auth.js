const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const authHeader = Object.keys(req.headers)
    .find((key) => key.toLowerCase() === 'authorization')
    ?.toLowerCase();
  const token = authHeader && req.headers[authHeader]?.startsWith('Bearer ')
    ? req.headers[authHeader].split(' ')[1]
    : null;

  if (!token) {
    console.log('No token provided for request:', req.url);
    return res.status(401).json({ message: 'Không có token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    console.log('Decoded token for', req.url, ':', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error for', req.url, ':', err.message);
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    console.log('Access denied for', req.url, ': user=', req.user, 'roles=', roles);
    return res.status(403).json({ message: 'Không đủ quyền' });
  }
  console.log('Authorized for', req.url, ': user=', req.user);
  next();
};