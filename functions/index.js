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

app.get('/posts', (req, res) => {
    db.collection('posts').orderBy('createdAt', 'desc').get()
    .then((data) => {
        let posts = [];
        data.forEach((doc) => {
            posts.push({
                postId: doc.id,
                ...doc.data()
            });
        })
        return res.json(posts)
    })
    .catch(err => console.error(err));
});

app.post('/posts', (req, res) => {
    const newPost = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    }

    db.collection('posts').add(newPost)
    .then((doc) => {
        res.json({message: `Document ${doc.id} created successfully`});
    })
    .catch(err => {
        res.status(500).json({
            error: 'Server Error'
        });
        console.error(err);
    });
})

//sign up route
app.post('/register', (req,res) => {
    const { email, password, confirmPassword, handle } = req.body;
    const newUser = {
        email,
        password,
        confirmPassword,
        handle
    }

    db.doc(`/users/${handle}`).get()
    .then(doc => {
       if(doc.exists){
           return res.status(400).json({
               handle: 'This handle is already taken'
           })
       } else {
        return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        .then(data => {
            return data.user.getIdToken()
            .then(token => {
                return res.status(201).json({ token })
            })
            .catch(err => {
                console.error(err);
                return res.status(500).json({
                    err: err.code
                })
            })
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            })
        })
       }
    })
    .catch(err => {
        return res.status(500).json({
            error: err.code
        })
    })
})

// auto turn the app into base route url/api
exports.api = functions.https.onRequest(app);