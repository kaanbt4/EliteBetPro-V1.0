document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    // Admin credentials
    const validCredentials = {
        username: 'admin',
        password: '002300Kaan'
    };
    
    // Show/hide password
    togglePasswordBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
    
    // Form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username === validCredentials.username && password === validCredentials.password) {
            // Create a session to indicate user is logged in
            sessionStorage.setItem('adminLoggedIn', 'true');
            
            // Redirect to admin panel
            window.location.href = 'admin.html';
        } else {
            // Show error message
            errorMessage.textContent = 'Kullanıcı adı veya şifre hatalı.';
            errorMessage.classList.add('active');
            
            // Clear error after 3 seconds
            setTimeout(() => {
                errorMessage.classList.remove('active');
            }, 3000);
        }
    });
    
    // Check if user is already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        window.location.href = 'admin.html';
    }
});
