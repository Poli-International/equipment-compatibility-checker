// Embed-specific initialization
(function() {
    if (!window.PoliTools || !window.PoliTools.EquipmentCompatibility || !window.PoliTools.EquipmentCompatibility.databases) {
        console.error("Poli Tools Core or its databases are not loaded. Cannot initialize embed.");
        document.body.innerHTML = '<p style="font-family: sans-serif; text-align: center; color: #DC3545; padding: 1rem;">Error: Could not load required data. Please try again later.</p>';
        return;
    }

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Load saved preference from localStorage
    const savedTheme = localStorage.getItem('equipmentCheckerTheme') || 'light-mode';
    body.className = `${savedTheme} embed-mode`;

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = body.classList.contains('dark-mode');
            if (isDark) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                localStorage.setItem('equipmentCheckerTheme', 'light-mode');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                localStorage.setItem('equipmentCheckerTheme', 'dark-mode');
            }
        });
    }

    // --- Email Form Handler ---
    const emailForm = document.getElementById('embed-email-form');
    if (emailForm) {
        const emailInput = document.getElementById('embed-email-input');
        const successMessage = document.getElementById('embed-email-success');
        const errorMessage = document.getElementById('embed-email-error');
        const submitButton = emailForm.querySelector('button[type="submit"]');

        emailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (submitButton.disabled) return;

            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
                setTimeout(() => { errorMessage.style.display = 'none'; }, 4000);
                return;
            }

            submitButton.disabled = true;
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Subscribing...';

            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            // Simulate network request
            setTimeout(() => {
                const isSuccess = Math.random() > 0.05; // 95% success rate

                if (isSuccess) {
                    successMessage.style.display = 'block';
                    emailForm.reset();
                    setTimeout(() => { successMessage.style.display = 'none'; }, 6000);
                } else {
                    errorMessage.textContent = '❌ Something went wrong. Please try again.';
                    errorMessage.style.display = 'block';
                    setTimeout(() => { errorMessage.style.display = 'none'; }, 4000);
                }

                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }, 800);
        });
    }

    // --- Compatibility Checker Setup ---
    // The checker is already initialized by checker.js
    // This just ensures everything is working in embed mode
    console.log('Equipment Compatibility Checker embed initialized successfully');
})();
