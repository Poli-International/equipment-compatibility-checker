// --- Community Feedback Form ---
const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
    const successMessage = document.getElementById('feedbackSuccess');
    const errorMessage = document.getElementById('feedbackError');
    const submitButton = feedbackForm.querySelector('button[type="submit"]');

    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (submitButton.disabled) return;

        // Basic validation
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        const text = document.getElementById('feedbackText').value;

        if (!email || !role || !text) {
            // You can add more specific inline validation if needed
            return;
        }

        submitButton.disabled = true;
        const originalButtonContent = submitButton.innerHTML;
        submitButton.innerHTML = `<span>Sending...</span>`;
        
        // Hide any previous messages
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';

        // Simulate network request
        setTimeout(() => {
            // Simulate a successful submission
            const isSuccess = Math.random() > 0.1; // 90% success rate for demo

            if (isSuccess) {
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';
                feedbackForm.reset();
            } else {
                successMessage.style.display = 'none';
                errorMessage.style.display = 'block';
            }
            
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonContent;

            // Hide message after a few seconds
            setTimeout(() => {
                if (successMessage) successMessage.style.display = 'none';
                if (errorMessage) errorMessage.style.display = 'none';
            }, 5000);

        }, 1000);
    });
}

// --- Email Notification Form ---
const emailForm = document.getElementById('footer-email-form');
if (emailForm) {
    const emailInput = document.getElementById('footer-email-input');
    const successMessage = document.getElementById('footer-email-success');
    const errorMessage = document.getElementById('footer-email-error');
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
