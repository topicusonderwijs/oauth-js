const TextEncodingShim = require('text-encoding-shim');
const Promise = require('promise-polyfill').default;
const iframe = require('./frame');
const util = require('./util');

let onSilentCallback;
let onErrorCallback;

/**
 * Starts authorization flow
 *
 * TODO Add code challenge!
 *
 * @public
 * @param config.redirectUri
 * @param config.usePrompt
 * @param config.loginUrl
 * @param config.responseType
 * @param config.clientId
 * @param config.scope
 * @param config.federationHint
 * @return url
 */
function authorize(config) {
  return new Promise((resolve, reject) => {

    const crypto = window.crypto || window.msCrypto;
    const codeVerifier = util.randomString(32);
    const uint8array = new TextEncodingShim.TextEncoder('utf-8').encode(codeVerifier);

    const onSuccess = (hash) => {
      const state = util.randomString(25);
      const redirectUri = encodeURI(config.redirectUri);
      const prompt = config.usePrompt ? '&prompt=none' : '';
      const loginUrl = `${config.loginUrl}/oauth2/authorize`;

      window.localStorage.setItem('codeVerifier', codeVerifier);

      const url = `${loginUrl}?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=${config.responseType}&state=${state}&scope=${config.scope}&federation_hint=${config.federationHint}&oauth2=authorize${prompt}`;

      resolve(url);
    };

    const onError = () => reject('Failed to authorize');
    const encrypt = crypto.subtle.digest("SHA-256", uint8array);
    encrypt.then(onSuccess, onError);
  });
}


/**
 * Start authorization flow with an iframe
 *
 * @public
 * @param config.onSilentCallback
 * @param config.onErrorCallback
 * @param config.redirectUri
 * @param config.usePrompt
 * @param config.loginUrl
 * @param config.responseType
 * @param config.clientId
 * @param config.scope
 * @param config.federationHint
 */
function refresh(config) {
  return new Promise((resolve, reject) => {
    onSilentCallback = config.onSilentCallback;
    onErrorCallback = config.onErrorCallback;

    const onSuccess = (url) => {
      iframe.setupIframe(url);
      resolve();
    };
    const onError = () => reject('Failed refresh token...');

    authorize(config).then(onSuccess, onError);
  });
}

/**
 * Exchange code for access token
 *
 * @public
 * @param code
 * @param config.redirectUri
 * @param config.loginUrl
 * @param config.clientId
 * @return access token
 */

function exchangeToken(code, config) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        window.localStorage.removeItem('codeVerifier');

        if (xhr.status === 200) {
          const tokens = JSON.parse(xhr.response);

          if (util.isIframe()) {
            return resolve(parent.postMessage({success: tokens}, config.redirectUri));
          }

          resolve(tokens);

        } else {

          if (util.isIframe()) {
            return reject(parent.postMessage({error: 'Failed Exchange'}, config.redirectUri));
          }

          reject('Failed Exchange');
        }
      }
    };

    const loginUrl = `${config.loginUrl}/oauth2/token`;
    const codeVerifier = window.localStorage.getItem('codeVerifier');
    const url = `${loginUrl}?code=${code}&client_id=${config.clientId}&grant_type=authorization_code&code_verifier=${codeVerifier}`;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send();
  });
}

/**
 * Invalidate session to logout
 *
 * @public
 */

function invalidate() {}


/**
 * Event listener for communicating between iframe and parent
 *
 * @public
 * @param e.data.success
 * @param e.data.error
 *
 * Removes iframe when done
 */

const eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
const eventer = window[eventMethod];
const messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

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
