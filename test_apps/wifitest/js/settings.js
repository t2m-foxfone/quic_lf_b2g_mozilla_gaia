/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Debug note: to test this app in a desktop browser, you'll have to set
 * the `dom.mozSettings.enabled' preference to false in order to avoid an
 * `uncaught exception: 2147500033' message (= 0x80004001).
 */

var Settings = {
  get mozSettings() {
    // return navigator.mozSettings when properly supported, null otherwise
    // (e.g. when debugging on a browser...)
    var settings = window.navigator.mozSettings;
    return (settings && typeof(settings.createLock) == 'function') ?
        settings : null;
  },

  // Early initialization of parts of the application that don't
  // depend on the DOM being loaded.
  preInit: function settings_preInit() {
    var settings = this.mozSettings;
    if (!settings)
      return;

    // Make a request for settings to warm the cache, since we need it
    // very soon in startup after the DOM is available.
    this.getSettings(null);

  },

  _initialized: false,

  init: function settings_init() {
    this._initialized = true;

    if (!this.mozSettings || !navigator.mozSetMessageHandler) {
      return;
    }

  },

  loadPanel: function settings_loadPanel(panel) {
    if (!panel)
      return;

    // apply the HTML markup stored in the first comment node
    for (var i = 0; i < panel.childNodes.length; i++) {
      if (panel.childNodes[i].nodeType == document.COMMENT_NODE) {
        panel.innerHTML = panel.childNodes[i].nodeValue;
        break;
      }
    }
    // translate content
    //navigator.mozL10n.translate(panel);

    // activate all scripts
    var scripts = panel.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src')
      if (document.head.querySelector('script[src="' + src + '"]')) {
        continue;
      }

      var script = document.createElement('script');
      script.type = 'application/javascript';
      script.src = src;
      document.head.appendChild(script);
    }

    // activate all stylesheets
    var stylesheets = panel.querySelectorAll('link');
    for (var i = 0; i < stylesheets.length; i++) {
      var href = stylesheets[i].getAttribute('href');
      if (document.head.querySelector('link[href="' + href + '"]'))
        continue;

      var stylesheet = document.createElement('link');
      stylesheet.type = 'text/css';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = href;
      document.head.appendChild(stylesheet);
    }


  },

  // Cache of all current settings values.  There's some large stuff
  // in here, but not much useful can be done with the settings app
  // without these, so we keep this around most of the time.
  _settingsCache: null,

  get settingsCache() {
    return this._settingsCache;
  },

  // True when a request has already been made to fill the settings
  // cache.  When this is true, no further get("*") requests should be
  // made; instead, pending callbacks should be added to
  // _pendingSettingsCallbacks.
  _settingsCacheRequestSent: false,

  // There can be race conditions in which we need settings values,
  // but haven't filled the cache yet.  This array tracks those
  // listeners.
  _pendingSettingsCallbacks: [ ],

  // Invoke |callback| with a request object for a successful fetch of
  // settings values, when those values are ready.
  getSettings: function(callback) {
    var settings = this.mozSettings;
    if (!settings)
      return;
    if (this._settingsCache && callback) {
      // Fast-path that we hope to always hit: our settings cache is
      // already available, so invoke the callback now.
      callback(this._settingsCache);
      return;
    }

    if (!this._settingsCacheRequestSent && !this._settingsCache) {
      this._settingsCacheRequestSent = true;
      var lock = settings.createLock();
      var request = lock.get('*');
      request.onsuccess = function(e) {
        var result = request.result;
        var cachedResult = {};
        for (var attr in result) {
          cachedResult[attr] = result[attr];
        }
        Settings._settingsCache = cachedResult;
        var cbk;
        while ((cbk = Settings._pendingSettingsCallbacks.pop())) {
          cbk(result);
        }
      };
    }
    if (callback) {
      this._pendingSettingsCallbacks.push(callback);
    }
  }

};

// apply user changes to 'Settings' + panel navigation
window.addEventListener('load', function loadSettings() {
  window.removeEventListener('load', loadSettings);
  window.addEventListener('change', Settings);

  Settings.init();

  setTimeout(function() {
    var scripts = [
      'js/utils.js',
//      'shared/js/mouse_event_shim.js',
      'shared/js/mobile_operator.js',
      'js/connectivity.js'
    ];
    scripts.forEach(function attachScripts(src) {
      var script = document.createElement('script');
      script.src = src;
      document.head.appendChild(script);
    });
  });

  // panel lazy-loading
  function lazyLoad(panel) {
    if (panel.children.length) // already initialized
      return;

    Settings.loadPanel(panel);
  }

  // panel navigation
  var oldHash = window.location.hash || '#root';
  function showPanel() {
    var hash = window.location.hash;
      console.log("yl::oldhash"+oldHash);
      console.log("yl::hash"+hash);
    var oldPanel = document.querySelector(oldHash);
    var newPanel = document.querySelector(hash);

    // load panel (+ dependencies) if necessary -- this should be synchronous
    lazyLoad(newPanel);

    // switch previous/current/forward classes
    // FIXME: The '.peek' is here to avoid an ugly white
    // flickering when transitioning (gecko 18)
    // the forward class helps us 'peek' in the right direction
    oldPanel.className = newPanel.className ? 'peek' : 'peek previous forward';
    newPanel.className = newPanel.className ?
                           'current peek' : 'peek current forward';
    oldHash = hash;

    /**
     * Most browsers now scroll content into view taking CSS transforms into
     * account.  That's not what we want when moving between <section>s,
     * because the being-moved-to section is offscreen when we navigate to its
     * #hash.  The transitions assume the viewport is always at document 0,0.
     * So add a hack here to make that assumption true again.
     * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
     */
    if ((window.scrollX !== 0) || (window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }
        oldPanel.classList.remove('peek');
        oldPanel.classList.remove('forward');
        newPanel.classList.remove('peek');
        newPanel.classList.remove('forward');
  }

  showPanel();
});


// startup & language switching
window.addEventListener('localized', function showLanguages() {
  // set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

// Do initialization work that doesn't depend on the DOM, as early as
// possible in startup.
Settings.preInit();

//MouseEventShim.trackMouseMoves = false;
