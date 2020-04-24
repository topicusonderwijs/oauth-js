const Promise = require('promise-polyfill').default;
const util = require('./util');
const iframe = require('./frame');

var onSilentCallback = function() {};
var onErrorCallback = function () {};

/**
 * Starts authorization flow
 *
 * @public
 * @param config.redirectUri
 * @param config.prompt
 * @param config.loginUrl
 * @param config.responseType
 * @param config.clientId
 * @param config.scope
 * @param config.useCodeChallenge
 * @param config.statePrefix
 * @param config.idToken
 * @param config.username
 * @return url
 */

function authorize(config) {
  return new Promise(function(resolve, reject) {
    const codeVerifier = util.randomString(32);
    const statePrefix = config.statePrefix ? config.statePrefix : '';
    const params = {
      state: statePrefix + util.randomString(25),
      redirectUri: encodeURI(config.redirectUri),
      prompt: config.prompt ? '&prompt=' + config.prompt : '',
      loginUrl: config.loginUrl + '/oauth2/authorize',
      idToken: config.idToken ? '&id_token_hint=' + config.idToken : '',
      username: config.username ? '&username=' + config.username : ''
    };

    if (config.useCodeChallenge) {
      util.encrypt(codeVerifier).then(function(codeChallenge) {
        util.setCookie('codeVerifier', codeVerifier, 60);
        util.setCookie('state', params.state, 60);

        params.codeChallenge = '&code_challenge_method=S256&code_challenge=' + codeChallenge;
        const url = util.createAuthorizeUrl(config, params);
        resolve(url);
      }).catch(function() {
        reject('ERROR_FAILED_AUTHORIZE');
      });
    } else {
      params.codeChallenge = '';
      const url = util.createAuthorizeUrl(config, params);
      util.setCookie('codeVerifier', codeVerifier, 60);
      util.setCookie('state', params.state, 60);
      resolve(url);
    }
  });
}

/**
 * Start authorization flow with an iframe
 *
 * @public
 * @param config.onSilentCallback
 * @param config.onErrorCallback
 * @param config.redirectUri
 * @param config.prompt
 * @param config.loginUrl
 * @param config.responseType
 * @param config.clientId
 * @param config.scope
 * @param config.useCodeChallenge
 * @param config.statePrefix
 *
 * @return Promise
 */

function refresh(config) {
  return new Promise(function(resolve, reject) {
    onSilentCallback = config.onSilentCallback;
    onErrorCallback = config.onErrorCallback;

    authorize(config).then(function (url) {
      iframe.setupIframe(url);
      resolve();
    }).catch(function () {
      reject('ERROR_FAILED_REFRESH');
    });
  });
}

/**
 * Exchange code for access token
 *
 * @public
 * @param options.code
 * @param options.state
 * @param config.redirectUri
 * @param config.loginUrl
 * @param config.clientId
 * @return access token
 */

function exchangeToken(options, config) {
  return new Promise(function(resolve, reject) {

    if (!options.code || options.state !== util.getCookie('state')) {

      if (util.isIframe()) {
        return reject(parent.postMessage({error: 'ERROR_EMPTY_CODE_STATE'}, config.redirectUri));
      }

      return reject('ERROR_EMPTY_CODE_STATE');
    }

    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        util.deleteCookie('codeVerifier');
        util.deleteCookie('state');

        if (xhr.status === 200) {
          const tokens = JSON.parse(xhr.response);

          if (util.isIframe()) {
            return resolve(parent.postMessage({success: tokens}, config.redirectUri));
          }

          resolve(tokens);

        } else {

          if (util.isIframe()) {
            return reject(parent.postMessage({error: 'ERROR_FAILED_EXCHANGE'}, config.redirectUri));
          }

          reject('ERROR_FAILED_EXCHANGE');
        }
      }
    };

    const loginUrl = config.loginUrl + '/oauth2/token';
    const codeVerifier = util.getCookie('codeVerifier');
    const url = loginUrl + '?code=' + options.code + '&client_id=' + config.clientId + '&grant_type=authorization_code' + '&code_verifier=' + codeVerifier;

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

eventer(messageEvent, function(e) {
  if (e.data.success) {
    onSilentCallback.apply(this, [e.data.success]);
    iframe.removeIframe();
  } else if (e.data.error) {
    onErrorCallback.apply(this, [e.data.error]);
    iframe.removeIframe();
  }
}, false);

module.exports.authorize = authorize;
module.exports.exchangeToken = exchangeToken;
module.exports.refresh = refresh;
module.exports.invalidate = invalidate;
