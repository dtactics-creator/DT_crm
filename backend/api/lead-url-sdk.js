export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const sdkJs = `
(function() {
  'use strict';

  var STORAGE_TK_KEY = '_dt_tk';
  var STORAGE_SID_KEY = '_dt_sid';
  var STORAGE_VID_KEY = '_dt_vid';

  function getQueryParam(name) {
    try {
      var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return match && decodeURIComponent(match[1].replace(/\\+/g, ' '));
    } catch(e) { return null; }
  }

  function getOrCreateVisitorId() {
    try {
      var vid = localStorage.getItem(STORAGE_VID_KEY);
      if (!vid) {
        vid = 'vid_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem(STORAGE_VID_KEY, vid);
      }
      return vid;
    } catch(e) { return 'vid_anon'; }
  }

  function cleanUrlParameters() {
    try {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      var hasTk = url.searchParams.has(STORAGE_TK_KEY);
      var hasSid = url.searchParams.has(STORAGE_SID_KEY);
      if (hasTk || hasSid) {
        url.searchParams.delete(STORAGE_TK_KEY);
        url.searchParams.delete(STORAGE_SID_KEY);
        var cleanUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
        window.history.replaceState(window.history.state, document.title, cleanUrl);
      }
    } catch(e){}
  }

  function getContext() {
    var tk = getQueryParam(STORAGE_TK_KEY);
    var sid = getQueryParam(STORAGE_SID_KEY);

    if (tk) {
      try {
        sessionStorage.setItem(STORAGE_TK_KEY, tk);
        localStorage.setItem(STORAGE_TK_KEY, tk);
      } catch(e){}
    } else {
      try {
        tk = sessionStorage.getItem(STORAGE_TK_KEY) || localStorage.getItem(STORAGE_TK_KEY);
      } catch(e){}
    }

    if (sid) {
      try {
        sessionStorage.setItem(STORAGE_SID_KEY, sid);
        localStorage.setItem(STORAGE_SID_KEY, sid);
      } catch(e){}
    } else {
      try {
        sid = sessionStorage.getItem(STORAGE_SID_KEY) || localStorage.getItem(STORAGE_SID_KEY);
      } catch(e){}
    }

    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      try {
        sessionStorage.setItem(STORAGE_SID_KEY, sid);
      } catch(e){}
    }

    // Strip _dt_tk and _dt_sid from browser URL bar after capturing context
    cleanUrlParameters();

    return { token: tk || null, sessionId: sid, visitorId: getOrCreateVisitorId() };
  }

  var ctx = getContext();

  var currentPath = window.location.pathname || '/';
  var startTime = Date.now();
  var scriptTag = document.currentScript;
  var backendOrigin = scriptTag ? new URL(scriptTag.src).origin : window.location.origin;

  function reportPageView(pathName, durationSec) {
    var endpoint = backendOrigin + '/api/lead-url-tracking';
    var payload = JSON.stringify({
      tracking_token: ctx.token || null,
      session_id: ctx.sessionId,
      visitor_id: ctx.visitorId,
      hostname: window.location.hostname || '',
      path: pathName || window.location.pathname || '/',
      full_url: window.location.href,
      referrer: document.referrer || null,
      duration_seconds: durationSec || 0
    });

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          credentials: 'omit',
          keepalive: true
        }).catch(function(){});
      }
    } catch(e){}
  }

  // Record initial page load
  reportPageView(currentPath, 0);

  // Monitor SPA route changes
  function onRouteChanged() {
    var newPath = window.location.pathname || '/';
    if (newPath !== currentPath) {
      var duration = Math.round((Date.now() - startTime) / 1000);
      reportPageView(currentPath, duration);
      currentPath = newPath;
      startTime = Date.now();
      reportPageView(currentPath, 0);
    }
  }

  var origPushState = history.pushState;
  if (origPushState) {
    history.pushState = function() {
      origPushState.apply(this, arguments);
      onRouteChanged();
    };
  }

  var origReplaceState = history.replaceState;
  if (origReplaceState) {
    history.replaceState = function() {
      origReplaceState.apply(this, arguments);
      onRouteChanged();
    };
  }

  window.addEventListener('popstate', onRouteChanged);
  window.addEventListener('hashchange', onRouteChanged);

  window.addEventListener('beforeunload', function() {
    var duration = Math.round((Date.now() - startTime) / 1000);
    reportPageView(currentPath, duration);
  });
})();
  `;

  return res.status(200).send(sdkJs);
}

