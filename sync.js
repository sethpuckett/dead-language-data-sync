var firebase = require("firebase/app");
var Tabletop = require("tabletop");
require("firebase/auth");
require("firebase/firestore");
require("./config.js");

function startSync() {
  Tabletop.init({
    key: config.key,
    callback: spreadsheetLoaded,
    errorCallback: error => console.log(error)
  });
}

function spreadsheetLoaded(data, tabletop) {
  // Find a sheet with the name metadata and load all data
  const metadataSheet = tabletop.sheets('metadata');
  const lessonSheet = tabletop.sheets('lessons');
  const allMetadata = metadataSheet.all();
  const lessons = lessonSheet.all();

  saveLessonData(lessons);
  saveStageData(tabletop, allMetadata);
}

function saveLessonData(lessons) {
  lessons.forEach(function(lesson) {
    // save lesson data to firestore
    firebase.firestore().collection('lessons').doc(lesson.id).set({
      name: lesson.name,
      info: lesson.info.split('\n'), // split on comma, unless in quotes
      stages: lesson.stages.split(','),
    }).then(() => {
      console.log(`Lesson ${lesson.id} successfully written!`);
    }).catch((error) => {
      console.log(error);
    });
  });
}

function saveStageData(tabletop, allMetadata) {
  // for each sheet in the spreadsheet
  tabletop.foundSheetNames.forEach(function(sheetName) {
    // ignore metadata & lesson sheets and anything that starts with 'ignore-'
    if (sheetName === 'lessons' || sheetName === 'metadata' || sheetName.startsWith('ignore-')) {
      return;
    }

    // find metadata row that corresponds to this sheet
    const metadata = allMetadata.find(function(metadataEntry) {
      return metadataEntry.id === sheetName;
    });

    // load all vocab in the sheet
    const rawVocab = tabletop.sheets(sheetName).elements
    // cleanup vocab (remove blank strings, split alternatives array)
    const vocab = rawVocab.map(function(vocabEntry) {
      const alternatives = vocabEntry.alternatives.split(',').filter(e => e != null && e !== '');
      return {
        id: vocabEntry.id,
        language1: vocabEntry.language1,
        language2: vocabEntry.language2,
        partOfSpeech: vocabEntry.partOfSpeech,
        gender: vocabEntry.gender !== '' ? vocabEntry.gender : null,
        alternatives: alternatives.length > 0 ? alternatives : null
      }
    });

    // save stage data to firestore
    firebase.firestore().collection('stages').doc(sheetName).set({
      name: metadata.name,
      type: metadata.type,
      vocab: vocab
    }).then(() => {
      console.log(`Stage ${sheetName} successfully written!`);
    }).catch((error) => {
      console.log(error);
    });
  });
}

// sign in and sync data
firebase.initializeApp(config.firebaseConfig);
firebase.auth().onAuthStateChanged(function(user) { if (user) { startSync(); } });
firebase.auth().signInWithEmailAndPassword(config.user, config.pass).catch(function(error) { console.log(error); });