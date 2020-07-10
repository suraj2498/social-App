// Method to check for empty strings
const isEmpty = (string) => {
    return (string.trim() === '') ? true : false;
}

exports.validateRegisterData = (newUser) => {
    const { email, password, confirmPassword, handle } = newUser;
    // Validation errors holder
    let errors = {}

    // validate email field
    if(isEmpty(email)){
        errors.email = 'Please Enter an email';
    } 
    if(isEmpty(password)){
        errors.password = 'Please Enter a Password';
    } 
    if(password !== confirmPassword){
        errors.confirmPassword = 'Passwords Do not match';
    }
    if(isEmpty(handle)){
        errors.handle = 'Please enter a user handle';
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
}

exports.validateLoginData = (user) => {
    const { email, password } = user;
    let errors = {};
    // Validation for empty fields
    if(isEmpty(email)){
        errors.email = 'Please enter your email'
    }
    if(isEmpty(password)){
        errors.password = 'Please enter your password'
    }

    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0
    }
}

// verify additional details like bio, website, and location
exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.bio.trim())){
        userDetails.bio = data.bio;
    }
    if(!isEmpty(data.website.trim())){
        if(data.website.trim().substring(0, 4) !== 'http'){
            userDetails.website = `http://${data.website.trim()}`;
        } else {
            userDetails.website = data.website.trim();
        }
    }
    if(!isEmpty(data.location.trim())){
        userDetails.location = data.location;
    }
    return userDetails;
}