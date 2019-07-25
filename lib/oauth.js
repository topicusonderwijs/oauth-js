const TextEncodingShim = require('text-encoding-shim');
const Promise = require('promise-polyfill').default;
const iframe = require('./frame');
const util = require('./util');

let onSilentCallback;
let onErrorCallback;

function authorize(config) {
  return new Promise((resolve, reject) => {

    const crypto = window.crypto || window.msCrypto;
    const codeVerifier = util.randomString(32);
    const uint8array = new TextEncodingShim.TextEncoder('utf-8').encode(codeVerifier);

    const onSuccess = (hash) => {
      // Code challenge nog toevoegen
      const state = util.randomString(25);
      const redirectUri = encodeURI(config.redirectUri);
      const prompt = config.usePrompt ? '&prompt=none' : '';

      window.localStorage.setItem('codeVerifier', codeVerifier);

      const url = `${config.loginUrl}?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=${config.responseType}
      &state=${state}&scope=${config.scope}&federation_hint=${config.federationHint}&oauth2=authorize${prompt}`;

      resolve(url);
    };

    const onError = () => reject('Failed to authorize');
    const encrypt = crypto.subtle.digest("SHA-256", uint8array);
    encrypt.then(onSuccess, onError);
  });
}

function refresh(config) {
  onSilentCallback = config.onSilentCallback;
  onErrorCallback = config.onErrorCallback;

  const onSuccess = (url) => iframe.setupIFrame(url);
  const onError = () => {};

  authorize(config).then(onSuccess, onError);
}

function exchangeToken(code, config) {
  const xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      window.localStorage.removeItem('codeVerifier');

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.response);

        if (util.isIframe()) {
          return parent.postMessage({success: response}, 'http://localhost:4200/oauth2');
        }

        config.onLoginCallback.apply(this, [response]);
      } else {
        parent.postMessage({error: 'error'}, 'http://localhost:4200/oauth2');
      }
    }
  };

  const codeVerifier = window.localStorage.getItem('codeVerifier');
  const url = `${config.loginUrl}?code=${code}&client_id=${config.clientId}&grant_type=authorization_code&code_verifier=${codeVerifier}`;

  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  xhr.send();
}

function invalidate() {
  // logout
}

// Create IE + others compatible event handler
const eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
const eventer = window[eventMethod];
const messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

// Listen to message from child window
eventer(messageEvent,function(e) {
  if (onSilentCallback && e.data.success) {
    onSilentCallback.apply(this, [e.data.success]);
    iframe.removeIframe();
  } else if (onErrorCallback && e.data.error) {
    onErrorCallback.apply(this, [e.data.error]);
    iframe.removeIframe();
  }
}, false);

module.exports.authorize = authorize;
module.exports.exchangeToken = exchangeToken;
module.exports.refresh = refresh;
module.exports.invalidate = invalidate;
