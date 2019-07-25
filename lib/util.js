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

module.exports.isIframe = isIframe;
module.exports.randomString = randomString;
