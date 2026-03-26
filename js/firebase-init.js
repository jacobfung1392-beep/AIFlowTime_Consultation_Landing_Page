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
    var waitForAuthPersistence = opts.waitForAuthPersistence !== false;

    function _ensureApp() {
        if (appName) {
            try { return firebase.app(appName); }
            catch (e) { return firebase.initializeApp(AIFLOW_FIREBASE_CONFIG, appName); }
        }
        if (firebase.apps.length) return firebase.apps[0];
        return firebase.initializeApp(AIFLOW_FIREBASE_CONFIG);
    }

    var app = _ensureApp();

    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            var db = app.firestore();
            if (!app.__aiflowFirestoreConfigured) {
                var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                var settings = { merge: true };
                if (isSafari || isIOS) {
                    settings.experimentalForceLongPolling = true;
                } else {
                    settings.experimentalAutoDetectLongPolling = true;
                }
                db.settings(settings);
                app.__aiflowFirestoreConfigured = true;
            }
        } catch (e) {
            console.error('[firebase-init] db.settings() failed:', e);
        }
    }

    var _db = null;
    try { if (firebase.firestore) _db = app.firestore(); } catch(e) {}

    if (typeof firebase !== 'undefined' && firebase.auth) {
        var auth = app.auth();
        if (!waitForAuthPersistence) {
            if (typeof callback === 'function') callback(app);
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function() {});
            return { app: app, db: _db };
        }
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(function() { if (typeof callback === 'function') callback(app); })
            .catch(function() { if (typeof callback === 'function') callback(app); });
    } else {
        if (typeof callback === 'function') callback(app);
    }

    return { app: app, db: _db };
}
