// public/form-submit.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('service-request-form');
    if (!form) return; // S'il n'y a pas de formulaire sur la page, ne rien faire

    const feedbackDiv = document.getElementById('form-feedback');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        feedbackDiv.textContent = 'Envoi en cours...';
        feedbackDiv.style.color = 'black';

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                form.reset();
                feedbackDiv.innerHTML = '<p style="color: green; font-weight: bold;">Merci! Votre demande a été envoyée. Nous vous contacterons bientôt.</p>';
            } else {
                throw new Error('Erreur du serveur lors de l\'envoi.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            feedbackDiv.innerHTML = '<p style="color: red; font-weight: bold;">Une erreur de connexion est survenue. Veuillez réessayer.</p>';
        }
    });
});
