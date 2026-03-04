/**
 * Shared Firebase initialization for AIFlowTime.
 *
 * Usage:
 *   <script src="/js/firebase-init.js"></script>
 *   <script>
 *     initFirebase(function(app) {
 *       var db = app.firestore();
 *       // ready
 *     });
 *   </script>
 *
 * For CMS pages that use a named app:
 *   initFirebase(callback, { appName: 'cms' });
 */

var AIFLOW_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAX5Oqywa1N6H1rzsyH-Q6XI7lVj2GNlq0',
    authDomain: 'aiflowtime-hk.firebaseapp.com',
    projectId: 'aiflowtime-hk',
    storageBucket: 'aiflowtime-hk.firebasestorage.app',
    messagingSenderId: '11702108080'
};

function initFirebase(callback, opts) {
    opts = opts || {};
    var appName = opts.appName || undefined;

    function _ensureApp() {
        if (appName) {
            try { return firebase.app(appName); }
            catch (e) { return firebase.initializeApp(AIFLOW_FIREBASE_CONFIG, appName); }
        }
        if (firebase.apps.length) return firebase.apps[0];
        return firebase.initializeApp(AIFLOW_FIREBASE_CONFIG);
    }

    var app = _ensureApp();

    if (typeof firebase !== 'undefined' && firebase.auth) {
        var auth = app.auth();
        auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
            .then(function() { if (typeof callback === 'function') callback(app); })
            .catch(function() { if (typeof callback === 'function') callback(app); });
    } else {
        if (typeof callback === 'function') callback(app);
    }
}
