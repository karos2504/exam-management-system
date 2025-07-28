const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  const authHeaderKey = Object.keys(req.headers)
    .find((key) => key.toLowerCase() === 'authorization');
  const authHeader = authHeaderKey ? req.headers[authHeaderKey] : null;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    console.log(`[AUTH] No token provided for request: ${req.url}`);
    return res.status(401).json({ message: 'Không có token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    console.log(`[AUTH] Decoded token for ${req.url}:`, {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role, // Log the raw role from token
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    });
    req.user = decoded;
    next();
  } catch (err) {
    console.error(`[AUTH] JWT verification error for ${req.url}:`, err.message);
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    console.log(`[AUTHORIZE] Access denied for ${req.url}: No user data found on request.`, { user: req.user });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  // Chuyển đổi vai trò của người dùng về chữ thường và loại bỏ khoảng trắng thừa
  // Đảm bảo userRole luôn là string và đã được trim
  const userRole = req.user.role ? String(req.user.role).toLowerCase().trim() : null;

  if (!userRole) {
    console.log(`[AUTHORIZE] Access denied for ${req.url}: Invalid or missing role in user data.`, { user: req.user, processedUserRole: userRole });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  // Chuyển đổi các vai trò cho phép về chữ thường và loại bỏ khoảng trắng thừa
  const allowedRoles = roles.map((role) => (role ? String(role).toLowerCase().trim() : role));
  const isAuthorized = allowedRoles.includes(userRole);

  if (!isAuthorized) {
    console.log(`[AUTHORIZE] Access DENIED for ${req.url}:`, {
      userRole: `'${userRole}'`, // Log userRole sau khi trim
      allowedRoles,
      reason: `Role '${userRole}' not in allowed list.`,
      fullUserObject: req.user,
    });
    return res.status(403).json({ message: 'Không đủ quyền' });
  }

  console.log(`[AUTHORIZE] Access GRANTED for ${req.url}:`, {
    userRole: `'${userRole}'`, // Log userRole sau khi trim
    allowedRoles,
    fullUserObject: req.user,
  });
  next();
};