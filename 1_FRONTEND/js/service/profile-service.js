window.ProfileService = {
    API_URL: 'http://localhost:3000/api/v1/profile',

    async getProfile() {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(this.API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    data: data.data
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to fetch profile'
            }
        } catch (error) {
            console.error("ProfileService Get Profile Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    async updateProfile(payload) {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(this.API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: "Profile updated successfully",
                    data: data.data
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to update profile'
            }
        } catch (error) {
            console.error("ProfileService Update Profile Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    async uploadPhoto(file) {
        const token = window.AuthService.getToken();
        try {
            const formData = new FormData();
            formData.append('photo', file);

            const response = await fetch(`${this.API_URL}/photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: "Photo uploaded successfully",
                    data: data.data
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to upload photo'
            }
        } catch (error) {
            console.error("ProfileService Upload Photo Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    async updateGoals(payload) {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(`${this.API_URL}/goals`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: "Goals updated successfully",
                    data: data.data
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to update goals'
            }
        } catch (error) {
            console.error("ProfileService Update Goals Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    async clearGoals() {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(`${this.API_URL}/goals`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: "Goals cleared successfully",
                    data: data.data
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to clear goals'
            }
        } catch (error) {
            console.error("ProfileService Clear Goals Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

    async deleteProfile() {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(this.API_URL, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: 'Profile deleted successfully'
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to delete profile'
            }

        } catch (error) {
            console.error('Delete profile service error: ' + error)
            return {
                success: false,
                message: 'Could not connect to the server'
            }
        }
    },

    async changePassword(currentPassword, newPassword) {
        const token = window.AuthService.getToken();
        try {
            const response = await fetch(`${this.API_URL}/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                return {
                    success: true,
                    message: "Password changed successfully"
                }
            }
            return {
                success: false,
                message: data.detail || data.message || data.title || 'Failed to change password'
            }
        } catch (error) {
            console.error("ProfileService Change Password Error: ", error);
            return {
                success: false,
                message: 'Could not connect to the server'
            };
        }
    },

}
