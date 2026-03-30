export const validatePostContent = (text) => {
    return text && text.trim().length > 0;
};

export const validateEmail = (email) => {
    const regex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return regex.test(email);
};

export const showError = (element, message) => {
    element.style.borderColor = 'red';
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    element.parentNode.appendChild(errorElement);
};

export const clearErrors = (element) => {
    element.style.borderColor = '';
    const errorElement = element.parentNode.querySelector('.error-message');
    if (errorElement) errorElement.remove();
};

export const formatDate = (date) => {
    return new Date(date).toLocaleString();
};