const Base64url = require('base64url');
const TextEncodingShim = require('text-encoding-shim');
const Promise = require('promise-polyfill').default;

function authorize(config) {
  return new Promise((resolve, reject) => {
    const crypto = window.crypto || window.msCrypto;
    const codeVerifier = generateRandomString(32);
    const uint8array = new TextEncodingShim.TextEncoder('utf-8').encode(codeVerifier);

    const onSuccess = (hash) => {
      const state = generateRandomString(25);
      const codeChallenge = Base64url.encode(hash);
      const redirectUri = encodeURI(config.origin);
      const loginUrl = `${config.loginUrl}/oauth2/authorize`;

      window.localStorage.setItem('codeVerifier', codeVerifier);

      // const url = `${loginUrl}?client_id=${config.clientId}&code_challenge_method=S256&code_challenge=${codeChallenge}
      // &redirect_uri=${redirectUri}&response_type=code&state=${state}&scope=profile&federation_hint=PARNASSYS&oauth2=authorize`;

      const url = `${loginUrl}?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=code
      &state=${state}&scope=profile&federation_hint=PARNASSYS&oauth2=authorize`;

      resolve(url);
    };

    const onError = () => reject('Failed to authorize');
    const encrypt = crypto.subtle.digest("SHA-256", uint8array);
    encrypt.then(onSuccess, onError);
  });
}

function refresh() {
  // Open iframe
  // Doe authorize request

}

function invalidate() {
  // logout
}

function exchangeToken(code, config) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        window.localStorage.removeItem('codeVerifier');

        if (xhr.status === 200) {
          const response = JSON.parse(xhr.response);
          resolve(response);
        } else if (xhr.status === 400) {
          reject('There was an error 400');
        } else {
          reject('something else other than 200 was returned');
        }
      }
    };

    const codeVerifier = window.localStorage.getItem('codeVerifier');
    const url = `${config.loginUrl}?code=${code}&client_id=${config.clientId}&grant_type=authorization_code&code_verifier=${codeVerifier}`;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send();
  });
}

function generateRandomString(amount) {
  const arr = new Uint8Array(amount);
  const arr2 = new Array(amount);
  const crypto = window.crypto || window.msCrypto;
  crypto.getRandomValues(arr);

  for (let i = 0; i < amount; i++) {
    arr2[i] = ("0" + arr[i].toString(16)).substr(-2);
  }

  return arr2.join("");
}

function setupIFrame(config) {
  const iFrameElement = _createIFrame(config);
  const container = document.getElementById('iframeContainer');
  container.appendChild(iFrameElement);
}

function _createIFrame(config) {
  const iFrameElement = document.createElement('iframe');
  iFrameElement.setAttribute("src", 'https://www.google.com/webhp?igu=1');
  iFrameElement.style.width = "40rem";
  iFrameElement.style.height = "20rem";

  return iFrameElement;
}

function inIframe () {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

module.exports.authorize = authorize;
module.exports.exchangeToken = exchangeToken;
module.exports.refresh = refresh;
module.exports.invalidate = invalidate;
