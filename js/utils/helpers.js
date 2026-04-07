const validatePostContent = (text) => {
    return text && text.trim().length > 0;
};

const validateEmail = (email) => {
    const regex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return regex.test(email);
};

const showError = (element, message) => {
    element.style.borderColor = 'red';
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    element.parentNode.appendChild(errorElement);
};

const clearErrors = (element) => {
    element.style.borderColor = '';
    const errorElement = element.parentNode.querySelector('.error-message');
    if (errorElement) errorElement.remove();
};

const formatDate = (date) => {
    return new Date(date).toLocaleString();
};