// Dynamic configuration for consistent API and Socket connections
const CONFIG = {
    // If we're on localhost, use the explicit port. 
    // Otherwise, use the current origin (e.g., https://your-app.onrender.com)
    get API_URL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }
        return window.location.origin + '/api';
    },
    get SOCKET_URL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        return window.location.origin;
    }
};

// Export to window so all scripts can access it
window.APP_CONFIG = CONFIG;
