const { db } = require('../util/admin');
const { _onRequestWithOptions } = require('firebase-functions/lib/providers/https');

// get all posts
exports.getPosts = async (req, res) => {
    try {
        // get all posts and store them in array
        let posts= [];
        const data = await db.collection('posts').orderBy('createdAt', 'desc').get();
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                ...doc.data()
            });
        });
        return res.json(posts); // contents of post array in JSON form
    } catch (err) {
        console.error(err);
    }
}

// Make a new post
exports.createPost = async (req, res) => {

    const { body } = req.body;
    const newPost = {
        body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString()
    }

    try {
        // create new post
        const doc = await db.collection('posts').add(newPost);
        newPost.postId = doc.id;
        return res.json(newPost);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: 'Server Error'
        });
    }
}

// Delete post
exports.deletePost = async (req, res) => {
    try {
        // get the post in question
        const post = await db.doc(`/posts/${req.params.postId}`).get();
        if(post.exists){
            if(post.data().userHandle === req.user.handle){
                // returns an array of comments that are associated with this post
                const comments = await db.collection('/comments').where('postId', '==', req.params.postId).get(); 
                const likes = await db.collection('/likes').where('postId', '==', req.params.postId).get();   

                if(!comments.empty){
                    comments.docs.forEach(async doc => {
                        await db.doc(`/comments/${doc.id}`).delete();
                    });
                }
                if(!likes.empty){
                    likes.docs.forEach(async doc => {
                        await db.doc(`/likes/${doc.id}`).delete(); 
                    });
                }
                await db.doc(`/posts/${post.id}`).delete();
                res.status(200).json({message: 'Post Deleted'});
            } else {
                res.status(403).json({ error: 'Unauthorized User'});
            }
        } else {
            res.status(404).json({error: 'Post Not Found'});
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: err.code});
    }
}

// get single post
exports.getPost = async (req, res) => {
    let postData = {};
    try {
        const doc = await db.doc(`/posts/${req.params.postId}`).get();
        if(!doc.exists){
            return res.status(404).json({error: 'Post not found'});
        }
        postData = doc.data();
        // since posts don;t have an id field their doc.id (Auto id) is their identifier
        postData.postId = doc.id; 
        const data = await db.collection('/comments').orderBy('createdAt', 'desc').where('postId', '==', req.params.postId).get();
        postData.comments = [];
        data.forEach(doc => {
            postData.comments.push(doc.data());
        });
        return res.json(postData);   
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.code});
    }
};


// Make a comment on a post
exports.makeComment = async (req, res) => {
    const { body } = req.body;
    if(body.trim() === ''){
        return res.status(400).json({ error: 'Must not be empty'});
    }
    const newComment = {
        body,
        createdAt: new Date().toISOString(),
        postId: req.params.postId,
        userHandle: req.user.handle, // from the auth middleware
        userImage: req.user.imageUrl
    };

    try {
        const doc = await db.doc(`/posts/${req.params.postId}`).get();
        if(doc.exists){
            await doc.ref.update({commentCount: doc.data().commentCount + 1});
            const commentDoc = await db.collection('comments').add(newComment);
            return res.json({message: `Comment ${commentDoc.id} made successfully`});
        }
        return res.status(404).json({message: 'Post does not exist'});
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: err.code});
    }
}

// Like a post
// TODO FIgure out how to get the correct data back from get request corresponding to the post
exports.likePost = async (req, res) => {
    let postData;
    try {
        const likeDocument = await db.collection('/likes').where('userHandle', '==', req.user.handle).where('postId', '==', req.params.postId).limit(1).get();
        const postDocument = db.doc(`/posts/${req.params.postId}`); // used for the update
        const postDocumentData = await postDocument.get();
 
        if(postDocumentData.exists){
            postData = postDocumentData.data();
            postData.postId = postDocument.id
            const data = await likeDocument;
            if(data.empty){
                // Add like document to the db
                await db.collection('likes').add({
                    postId: req.params.postId,
                    userHandle: req.user.handle
                });
                postData.likeCount++;
                await postDocument.update({likeCount: postData.likeCount});
                return res.json(postData)
            } else {
                return res.status(400).json({error: 'Post Already Liked'})
            }
        } else {
            return res.status(404).json({error: 'Post Not Found'}); 
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: err.code});
    }
}


// Unlike Post
exports.unlikePost = async (req, res) => {
    let postData;
    try {
        const likeDocument = await db.collection('/likes').where('userHandle', '==', req.user.handle).where('postId', '==', req.params.postId).limit(1).get();
        const postDocument = db.doc(`/posts/${req.params.postId}`); // used for the update of the like count in the actual post
        const postDocumentData = await postDocument.get();
 
        if(postDocumentData.exists){
            postData = postDocumentData.data();
            postData.postId = postDocument.id
            const data = likeDocument; // get the like document

            if(!data.empty){ // their is a document which means that the post has been liked by the user
                //Delete a document from the db
                await db.doc(`/likes/${data.docs[0].id}`).delete();
                
                postData.likeCount--;
                await postDocument.update({likeCount: postData.likeCount});

                return res.json(postData);
            } else {
                return res.status(400).json({error: 'You Havent liked this post'})
            }
        } else {
            return res.status(404).json({error: 'Post Not Found'}); 
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({error: err.code});
    }
}