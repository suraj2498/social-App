const admin = require('firebase-admin');
var serviceAccount = require('../../service-acct/socialapp-e5130-firebase-adminsdk-uo6p6-ad34cfdcc4.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "socialapp-e5130.appspot.com",
    databaseURL: "https://socialapp-e5130.firebaseio.com"
});

const db = admin.firestore();

module.exports = { db, admin }