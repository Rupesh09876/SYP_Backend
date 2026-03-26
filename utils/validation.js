const validator = require('validator');

const validateEmail = (email) => {
    return validator.isEmail(email);
};

const validateNepaliPhone = (phone) => {
    // Format: +9779804077492 (10 digits after +977, starting with 9)
    const phoneRegex = /^\+9779[0-9]{9}$/;
    return phoneRegex.test(phone);
};

const validatePassword = (password) => {
    return password && password.length >= 6;
};

const validateName = (name) => {
    return name && name.length >= 2 && name.length <= 100;
};

const validateRole = (role) => {
    return ['admin', 'doctor', 'patient'].includes(role);
};

const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with 9, add +977
    if (cleaned.startsWith('9') && cleaned.length === 10) {
        cleaned = '+977' + cleaned;
    }
    
    // If it starts with 977, add +
    if (cleaned.startsWith('977') && cleaned.length === 12) {
        cleaned = '+' + cleaned;
    }
    
    return cleaned;
};

module.exports = {
    validateEmail,
    validateNepaliPhone,
    validatePassword,
    validateName,
    validateRole,
    formatPhoneNumber
};