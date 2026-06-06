document.addEventListener('DOMContentLoaded', function () {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
});

async function handleLogin() {

    const emailInput = document.getElementById('inputEmail');
    const passwordInput = document.getElementById('inputPassword');
    const btn = document.getElementById('loginBtn');
    const errorContainer = document.getElementById('loginError') || document.querySelector('.login-error');
    const originalText = btn.innerHTML;

    if (!emailInput.value.trim() || !passwordInput.value) {
        alert("Please enter both email and password.");
        return;
    }

    if (!window.AuthService) {
        alert('Login service is not ready. Please refresh the page.');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing in...';
    btn.disabled = true;

    const result = await window.AuthService.login(emailInput.value.trim(), passwordInput.value);

    if (result.success) {
        window.location.href = 'dashboard.html';
    } else {
        if (errorContainer) {
            errorContainer.textContent = result.message;
            errorContainer.style.display = 'block';
        } else {
            alert(result.message);
        }
        passwordInput.value = '';
        passwordInput.focus();
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
