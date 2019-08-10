var firebase = require("firebase/app");
var Tabletop = require("tabletop");
require("firebase/auth");
require("firebase/firestore");
require("./config.js");

const ZOMBIE_ASSAULT_REVIEW = 'zombie-assault-review';

function startSync() {
  console.log('Initializing TabletopJS');
  Tabletop.init({
    key: config.key,
    callback: spreadsheetLoaded,
    // debug: true,
    errorCallback: error => console.log(error)
  });
}

function spreadsheetLoaded(data, tabletop) {
  console.log('Spreadsheet loaded');
  // Find a sheet with the name metadata and load all data
  const metadataSheet = tabletop.sheets('metadata');
  const lessonSheet = tabletop.sheets('lessons');
  const allMetadata = metadataSheet.all();
  const lessons = lessonSheet.all();

  saveLessonData(lessons);
  saveStageData(tabletop, allMetadata);
  saveReviewStages(allMetadata);
}

function saveLessonData(lessons) {
  console.log('Saving lesson data')
  lessons.forEach(function(lesson) {
    // save lesson data to firestore
    firebase.firestore().collection('lessons').doc(lesson.id).set({
      name: lesson.name,
      info: lesson.info.split('\n'), // split on comma, unless in quotes
      stages: lesson.stages.split(',').map(s => s.trim()),
      requirements: lesson.requirements.split(',').map(s => s.trim()).filter(e => e !== ''),
    }).then(() => {
      console.log(`Lesson ${lesson.id} successfully written`);
    }).catch((error) => {
      console.log(error);
    });
  });
}

function saveReviewStages(allMetadata) {
  const reviewMetadata = allMetadata.filter(m => m.type === ZOMBIE_ASSAULT_REVIEW)
  reviewMetadata.forEach((md) => {
    // save stage data to firestore
    firebase.firestore().collection('stages').doc(md.id).set({
      name: md.name,
      type: md.type,
    }).then(() => {
      console.log(`Stage ${md.id} successfully written`);
    }).catch((error) => {
      console.log(error);
    });
  });
}

function saveStageData(tabletop, allMetadata) {
  console.log('Saving stage data');
  // for each sheet in the spreadsheet
  tabletop.foundSheetNames.forEach(function(sheetName) {
    // ignore metadata & lesson sheets and anything that starts with 'ignore-'
    if (sheetName === 'lessons' || sheetName === 'metadata' || sheetName.startsWith('ignore-')) {
      return;
    }

    // load all vocab in the sheet
    const rawVocab = tabletop.sheets(sheetName).elements
    // cleanup vocab (remove blank strings, split alternatives array)
    const vocab = rawVocab.map(function(vocabEntry) {
      const alternatives = vocabEntry.alternatives.split(',').filter(e => e != null && e !== '');
      return {
        id: vocabEntry.id,
        stage: vocabEntry.stage,
        language1: vocabEntry.language1,
        language2: vocabEntry.language2,
        partOfSpeech: vocabEntry.partOfSpeech,
        gender: vocabEntry.gender !== '' ? vocabEntry.gender : null,
        alternatives: alternatives.length > 0 ? alternatives : null
      }
    });

    const groupedVocab = groupBy(vocab, 'stage');
    groupedVocab.forEach((stageVocab) => {
      const stageName = stageVocab.key;
      const stageVocabValues = stageVocab.values;
      console.log(`Saving data for stage: ${stageName}`);

      // find metadata row that corresponds to this stage
      const metadata = allMetadata.find((metadataEntry) => {
        return metadataEntry.id === stageName;
      });

      if (metadata == null) {
        throw Error(`metadata is missing for stage ${stageName}.`);
      }

      // save stage data to firestore
      firebase.firestore().collection('stages').doc(stageName).set({
        name: metadata.name,
        type: metadata.type,
        vocab: stageVocabValues
      }).then(() => {
        console.log(`Stage ${stageName} successfully written`);
      }).catch((error) => {
        console.log(error);
      });
    });
  });
}

function groupBy(array, key) {
  return array.reduce(function (rv, x) {
    let v = key instanceof Function ? key(x) : x[key];
    let el = rv.find((r) => r && r.key === v);
    if (el) {
      el.values.push(x);
    } else {
      rv.push({ key: v, values: [x] });
    }
    return rv;
  }, []);
}

// sign in and sync data
console.log('Initializing Firebase');
firebase.initializeApp(config.firebaseConfig);
firebase.auth().onAuthStateChanged(function(user) { if (user) { startSync(); } });
firebase.auth().signInWithEmailAndPassword(config.user, config.pass).catch(function(error) { console.log(error); });