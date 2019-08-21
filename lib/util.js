const Promise = require('promise-polyfill').default;
const Base64url = require('base64url');
const TextEncodingShim = require('text-encoding-shim');

/**
 * Creates a code challenge
 *
 * @public
 * @param codeVerifier
 * @return Base64url.encode(codeChallenge)
 */

function encrypt(codeVerifier) {
  return new Promise(function(resolve, reject) {

    const crypto = window.crypto || window.msCrypto;
    const uint8array = new TextEncodingShim.TextEncoder('utf-8').encode(codeVerifier);
    const encrypt = crypto.subtle.digest("SHA-256", uint8array);

    if(isIE()) {

      encrypt.oncomplete = function(evt) {
        resolve(Base64url.encode(evt.target.result));
      };

      encrypt.onerror = function () {
        reject('ERROR_FAILED_ENCRYPTION');
      };

    } else {
      encrypt.then(function(codeChallenge) {
        resolve(Base64url.encode(codeChallenge));
      }).catch(function () {
        reject('ERROR_FAILED_ENCRYPTION');
      });
    }
  });
}

/**
 * Creates an authorize url
 *
 * @public
 * @param config.clientId
 * @param config.responseType
 * @param config.scope
 * @param params.loginUrl
 * @param params.redirectUri
 * @param params.state
 * @param params.prompt
 * @param params.codeChallenge
 * @return url
 */

function createAuthorizeUrl(config, params) {
  return params.loginUrl + '?client_id=' + config.clientId + '&redirect_uri=' + params.redirectUri + '&response_type=' +
    config.responseType + '&state=' + params.state + '&scope=' + config.scope + '&oauth2=authorize' + params.prompt +
    params.codeChallenge;
}

/**
 * Creates a random string
 *
 * @public
 * @param amount
 * @return string
 */

function randomString(amount) {
  const arr = new Uint8Array(amount);
  const arr2 = new Array(amount);
  const crypto = window.crypto || window.msCrypto;
  crypto.getRandomValues(arr);

  for (let i = 0; i < amount; i++) {
    arr2[i] = ("0" + arr[i].toString(16)).substr(-2);
  }

  return arr2.join("");
}

/**
 * Checks if the iframe is active
 *
 * @public
 * @return boolean
 */

function isIframe () {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Checks if Internet Explorer is the current browser
 *
 * @private
 * @return boolean
 */

function isIE() {
  const ua = window.navigator.userAgent;
  const msie = ua.indexOf("MSIE");
  return msie > 0 || !!ua.match(/Trident.*rv\:11\./);
}

module.exports.encrypt = encrypt;
module.exports.createAuthorizeUrl = createAuthorizeUrl;
module.exports.randomString = randomString;
module.exports.isIframe = isIframe;
