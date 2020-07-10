const functions = require('firebase-functions');
const express = require('express');
const auth = require('./util/auth');
const db = require('./util/admin');
const { getPosts, createPost, getPost, makeComment, likePost, unlikePost, deletePost } = require('./routes/posts');
const { register, login, uploadImage, addUserDetails, getUser } = require('./routes/users');
const app = express();

// SOCIAL APP POSTS ROUTES
app.get('/posts', getPosts);// Get all posts
app.post('/posts', auth, createPost); // Post a new post
app.get('/posts/:postId', getPost); // get info about a single post
app.delete('/posts/:postId', auth, deletePost); // delete a post
app.get('/posts/:postId/like', auth, likePost) // Like a post
app.get('/posts/:postId/unlike', auth, unlikePost) // Like a post
app.post('/posts/:postId/comment', auth, makeComment); // Make a comment on a post

// SOCIAL APP USERS ROUTES 
app.post('/register', register); //sign up route
app.post('/login', login); // Login route
app.post('/user/image', auth, uploadImage); // upload an image
app.post('/user', auth, addUserDetails);
app.get('/user', auth, getUser);

exports.createNotificationOnlike = functions.firestore.document('/likes/{id}').onCreate(async (snapshot) => {
    const doc = await db.document(`/posts/${snapshot.data().postId}`).get(); // we have access to user handle via the likes route
    if(doc.exists){
        db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString,
            recipient: doc.data.userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            postId: doc.id
        })
    }
})

// auto turn the app into base route url/api
exports.api = functions.https.onRequest(app);