var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("./config.js");


function syncData() {
  firebase.firestore().collection('lessons').doc('test').set({ test: '123' }).then(() => {
    console.log('Document successfully written!');
  }).catch((error) => {
    console.log(error);
  });
}

firebase.initializeApp(config.firebaseConfig);

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    syncData();
  }
});

firebase.auth().signInWithEmailAndPassword(config.user, config.pass).catch(function(error) {
  console.log(error);
});
