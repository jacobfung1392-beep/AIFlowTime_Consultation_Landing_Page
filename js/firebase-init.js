/**
 * Shared Firebase initialization for AIFlowTime.
 *
 * Usage:
 *   <script src="/js/firebase-init.js"></script>
 *   <script>
 *     initFirebase(function() {
 *       var db = firebase.firestore();
 *       // ready
 *     });
 *   </script>
 *
 * For CMS pages that use a named app:
 *   initFirebase(callback, { appName: 'cms' });
 */

var AIFLOW_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCYHnyFMwwFzRLkYBiPOJHGFLXQMmMSjUo',
    authDomain: 'aiflowtime-hk.firebaseapp.com',
    projectId: 'aiflowtime-hk',
    storageBucket: 'aiflowtime-hk.firebasestorage.app',
    messagingSenderId: '575616857587',
    appId: '1:575616857587:web:d7e15a4801ef3b3e0f2cc9'
};

function initFirebase(callback, opts) {
    opts = opts || {};
    var appName = opts.appName || undefined;

    function _getConfig() {
        if (firebase.apps.length) {
            var defaultApp = firebase.apps[0];
            return defaultApp.options || AIFLOW_FIREBASE_CONFIG;
        }
        return AIFLOW_FIREBASE_CONFIG;
    }

    function _ensureApp() {
        var config = _getConfig();
        if (appName) {
            try { return firebase.app(appName); }
            catch (e) { return firebase.initializeApp(config, appName); }
        }
        if (firebase.apps.length) return firebase.apps[0];
        return firebase.initializeApp(config);
    }

    function _ready() {
        var app = _ensureApp();
        if (typeof callback === 'function') callback(app);
    }

    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') {
        _ready();
        return;
    }

    var script = document.createElement('script');
    script.src = '/__/firebase/init.js';
    script.onload = function () { _ready(); };
    script.onerror = function () { _ready(); };
    document.head.appendChild(script);
}
