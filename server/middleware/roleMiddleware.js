module.exports = function(role) {
    return function(req, res, next) {
        if (req.user && (req.user.role === role || req.user.role === 'admin')) {
            next();
        } else {
            res.status(403).json({ message: `Access denied. Requires ${role} role.` });
        }
    };
};
