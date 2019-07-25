const TextEncodingShim = require('text-encoding-shim');
const Promise = require('promise-polyfill').default;

let onSilentCallback;
let onErrorCallback;


function authorize(config) {
  return new Promise((resolve, reject) => {

    const crypto = window.crypto || window.msCrypto;
    const codeVerifier = generateRandomString(32);
    const uint8array = new TextEncodingShim.TextEncoder('utf-8').encode(codeVerifier);


    const onSuccess = (hash) => {
      // Code challenge nog toevoegen
      const state = generateRandomString(25);
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

  const onSuccess = (url) => setupIFrame(url);
  const onError = () => {};

  authorize(config).then(onSuccess, onError);

}

function invalidate() {
  // logout
}

function exchangeToken(code, config) {

  if (!code || !config) {
    return;
  }

  const xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      window.localStorage.removeItem('codeVerifier');

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.response);

        if (inIframe()) {
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

function setupIFrame(url) {
  const iFrameContainer = createIframe(url);
  const body = document.getElementsByTagName("BODY")[0];
  body.appendChild(iFrameContainer);
}

function createIframe(url) {
  const iFrameContainer = document.createElement('div');
  iFrameContainer.setAttribute("id", 'authFrameContainer');
  iFrameContainer.style.display = "none";

  const iFrameElement = document.createElement('iframe');
  iFrameElement.setAttribute("src", url);
  iFrameElement.setAttribute("id", 'authFrame');
  iFrameElement.style.width = "40rem";
  iFrameElement.style.height = "20rem";

  iFrameContainer.appendChild(iFrameElement);
  return iFrameContainer;
}

function removeIframe() {
  const frame = document.getElementById('#authFrameContainer');

  if (frame) {
    frame.parentNode.removeChild(frame);
  }
}

// Create IE + others compatible event handler
const eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
const eventer = window[eventMethod];
const messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

// Listen to message from child window
eventer(messageEvent,function(e) {
  if(typeof e.data === "string" && e.data.startsWith("ERROR")){
    alert("Opnieuw inloggen nodig");
  } else {
    if (onSilentCallback && e.data.success) {
      onSilentCallback.apply(this, [e.data.success]);
    } else if (onErrorCallback && e.data.error) {
      onErrorCallback.apply(this, [e.data.error]);
    }

    // removeIframe();
  }
}, false);

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
