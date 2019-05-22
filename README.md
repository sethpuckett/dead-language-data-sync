# dead-language-data-sync
Tool for updating static language data in Google Firestore.

See [Dead Language](https://github.com/sethpuckett/dead-language) repository for more details.

## Usage

Create a `config.js` file at the project root. It should look like this:

```js
config = {
  user: 'test',
  pass: 'test',
  key: 'test',
  firebaseConfig: {
    apiKey: "test",
    authDomain: "test",
    databaseURL: "test",
    projectId: "test",
    storageBucket: "test",
    messagingSenderId: "test",
    appId: "test"
  },
};
```

Run from the command line with `node sync.js`
