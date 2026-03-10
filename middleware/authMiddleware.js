function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        if (req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(401).json({ error: 'Authentication required' });
        } else {
            return res.redirect('/');
        }
    }
    next();
}

function requireRole(role) {
    return function (req, res, next) {
        if (!req.session || req.session.role !== role) {
            if (req.originalUrl.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                return res.status(403).json({ error: 'Access denied: insufficient privileges' });
            } else {
                return res.status(403).send('Access denied. <a href="/">Go home</a>');
            }
        }
        next();
    };
}

module.exports = {
    requireAuth,
    requireRole
};
