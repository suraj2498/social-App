const { admin, db } = require('./admin');

// Authentication middleware
module.exports = async (req, res, next) => {
    try {
        // check if there is an authorization value in headers and if value start with 'Bearer'
        if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
            const idToken = req.headers.authorization.split('Bearer ')[1]; // Get the id token
            const decodedIdToken = await admin.auth().verifyIdToken(idToken); // decode token

            req.user = decodedIdToken; // attach the decoded user to the request 
            // console.log(decodedIdToken);
            
            const data = await db.collection('users').where('userId', '==', req.user.uid).limit(1).get(); // only get document where user id match decoded value
            req.user.handle = data.docs[0].data().handle; // set the handle to value in corresponding user
            req.user.imageUrl = data.docs[0].data().imageURL; // sets the image URL to value in corresponding user
            return next();  
        } else {
            console.error('No token found'); 
            res.status(403).json({
                error: 'Unauthorized'
            });
        }   
    } catch (err) {
        console.error(err);
        res.status(403).json({
            error: err
        });
    }
}