window.AuthService = {
    API_URL: 'http://localhost:3000/api/v1/auth',

    async login(email, password) {
        try {
            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                this.saveToken(data.data.token);
                return {
                    success: true,
                };
            }

            return {
                success: false,
                message: data.detail || data.message || data.title || 'Login failed'
            };

        } catch (error) {
            console.error("AuthService Login Error: ", error);

            return {
                success: false,
                message: 'Could not connect to the server'
            };

        }
    },

    async register(payload) {
        try {
            const response = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                this.saveToken(data.data.token);
                return {
                    success: true,
                };
            }

            return {
                success: false,
                message: data.detail || data.message || data.title || 'Registration failed'
            };

        } catch (error) {
            console.error("AuthService Register Error: ", error);

            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    saveToken(token) {
        localStorage.setItem('fittrack_token', token);
    },

    getToken() {
        return localStorage.getItem('fittrack_token');
    },

    logout() {
        localStorage.removeItem('fittrack_token');
        localStorage.removeItem('fittrack_user');
        window.location.href = 'login.html';
    },

    isAuthenticated() {
        return !!this.getToken();
    }
}
