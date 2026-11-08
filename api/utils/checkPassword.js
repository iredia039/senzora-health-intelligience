function checkPassword(password) {
    if (typeof password !== 'string') {
        return 'password must be text'
    }

    if (password.length < 8) {
        return 'password must be at least 8 characters long'
    }

    if (!/[A-Z]/.test(password)) {
        return 'password must contain at least one capital letter'
    }

    if (!/[0-9]/.test(password)) {
        return 'password must contain at least one number'
    }

    return null
}

module.exports = { checkPassword }