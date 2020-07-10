const { admin,db } = require('../util/admin');
const { validateRegisterData, validateLoginData, reduceUserDetails } = require('../util/validators');
const firebase = require('firebase');
const config  = require('../util/config.js');
firebase.initializeApp(config);

// Register user
exports.register = async (req,res) => {
    const { email, password, confirmPassword, handle } = req.body;

    const newUser = {
        email,
        password,         
        confirmPassword,
        handle
    }
    const blankImage = 'blank-profile.webp';
    const { errors, valid } = validateRegisterData(newUser);

    // Return in the case of validation errors
    if(!valid){
        return res.status(400).json(errors)
    }
 
    try {
        const doc = await db.doc(`/users/${handle}`).get();
        // If the handle has already been taken
        if(doc.exists){
            return res.status(400).json({
                handle: 'This handle is already taken'
            })
        } else {
            // Create new user and get token
            const data = await firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            const token = await data.user.getIdToken();
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId: data.user.uid,
                imageURL: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${blankImage}?alt=media`
            }

            // Creates new user document
            await db.doc(`/users/${newUser.handle}`).set(userCredentials); // New doc will be named after the handle
            return res.status(200).json({ token }); 
        }  
    } catch (err) {
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({
                email: 'Email is already in use'
            });
        } else {
            console.error(err);
            return res.status(500).json({
                err: err.code
            }); 
        }
    }
}

// Login user
exports.login = async (req,res) => {

    // Extract body fields
    const { email, password } = req.body;
    const user = {
        email,
        password
    }

    const { errors, valid } = validateLoginData(user);

    if(!valid){
        return res.status(400).json(errors);
    }

    try {
        const data = await firebase.auth().signInWithEmailAndPassword(user.email, user.password);
        const token = await data.user.getIdToken();
        return res.json({token})   
    } catch (err) {
        if(err.code === 'auth/wrong-password'){
            return res.status(403).json({
                general: 'Password in incorrect please try again'
            })
        } else {
            console.error(err);
            res.status(500).json({
                error: 'Server Error'
            });   
        }
    }
}

// Add User Details (Bio, Website, )
exports.addUserDetails = async (req, res) => {
    let userDetails = reduceUserDetails(req.body);
    try {
        await db.doc(`/users/${req.user.handle}`).update(userDetails);
        return res.json({
            message: 'Details Added Successfully'
        });    
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.code
        })
    }
}

// Upload User image
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            res.status(400).json({
                error: 'Incorrect File Type Submitted'
            })
        }
        
        // Ex. my.image,jpg
        const fileNameArray = filename.split('.');
        const imageExtension = fileNameArray[fileNameArray.length - 1]; // gets the extension

        // 1234796.jpg
        imageFileName = `${Math.round(Math.random() * 10000)}.${imageExtension}`;

        // concatenates the tempDir(cloud directory) with the filename
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = {filepath, mimetype};
        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', async () => {
        try {
            await admin.storage().bucket().upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            });
    
            const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            await db.doc(`/users/${req.user.handle}`).update({
                imageURL
            });  
            
            return res.json({
                message: 'Image Uploaded Successfully'
            })
            
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                error: 'Server Error'
            })
        }
    });

    console.log(req.rawBody);
    busboy.end(req.rawBody);
}

// Get logged in user details
exports.getUser = async (req, res) => {
    let userData = {};
    try {
        const doc = await db.doc(`/users/${req.user.handle}`).get(); //' handle 'available via auth middleware
        if(doc.exists){
            userData.credentials = doc.data();
            const data = await db.collection('likes').where('userHandle', '==', req.user.handle).get();
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
        } 
        return res.json(userData);   
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.code});
    }
}