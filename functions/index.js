const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase')

var serviceAccount = require('../service-acct/socialapp-e5130-firebase-adminsdk-uo6p6-ad34cfdcc4.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialapp-e5130.firebaseio.com"
});

const firebaseConfig = {
    apiKey: "AIzaSyBeEq5fad2S-BTITuX3iAkAbtmlVq2WkTA",
    authDomain: "socialapp-e5130.firebaseapp.com",
    databaseURL: "https://socialapp-e5130.firebaseio.com",
    projectId: "socialapp-e5130",
    storageBucket: "socialapp-e5130.appspot.com",
    messagingSenderId: "481360036379",
    appId: "1:481360036379:web:f37d3cd043f7733966eebe",
    measurementId: "G-5H0TZQY7CL"
  };


firebase.initializeApp(firebaseConfig);
const app = express();

const db = admin.firestore();

app.get('/posts', async (req, res) => {
    try {
        // get all posts and store them in array
        let posts= [];
        const data = await db.collection('posts').orderBy('createdAt', 'desc').get()
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                ...doc.data()
            })
        });
        return res.json(posts);
    } catch (err) {
        console.error(err);
    }
});

// TODO add auth middleware for protected routes
app.post('/posts', auth, async (req, res) => {

    const { body, userHandle } = req.body;
    const newPost = {
        body,
        userHandle,
        createdAt: new Date().toISOString()
    }

    try {
        // create new post
        const doc = await db.collection('posts').add(newPost);
        res.json({message: `Document ${doc.id} created successfully`});
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Server Error'
        });
    }
})

// Method to check for empty strings
const isEmpty = (string) => {
    return (string.trim() === '') ? true : false;
}

//sign up route
app.post('/register', async (req,res) => {
    // Validation errors holder
    let errors = {}
    const { email, password, confirmPassword, handle } = req.body;

    const newUser = {
        email,
        password,         
        confirmPassword,
        handle
    }

    // validate email field
    if(isEmpty(email)){
        errors.email = 'Please Enter an email'
    } 
    if(isEmpty(password)){
        errors.password = 'Please Enter a Password'
    } 
    if(password !== confirmPassword){
        errors.confirmPassword = 'Passwords Do not match'
    }
    if(isEmpty(handle)){
        errors.handle = 'Please enter a user handle'
    }

    // Return in the case of validation errors
    if(Object.keys(errors).length > 0){
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
                userId: data.user.uid
            }
            // Creates new user document
            await db.doc(`/users/${newUser.handle}`).set(userCredentials);
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
})

// Login route
app.post('/login', async (req,res) => {

    // Extract body fields
    const { email, password } = req.body;
    const user = {
        email,
        password
    }

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

    try {
        const data = await firebase.auth().signInWithEmailAndPassword(email, password);
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
});

// auto turn the app into base route url/api
exports.api = functions.https.onRequest(app);