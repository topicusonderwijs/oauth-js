const oauth = require('./lib/oauth');

function authorize(config) {
  return oauth.authorize(config);
}

function refresh(config) {
  return oauth.refresh(config);
}

function exchangeToken(code, config) {
  return oauth.exchangeToken(code, config);
}

function invalidate() {
  return oauth.invalidate();
}

module.exports.authorize = authorize;
module.exports.exchangeToken = exchangeToken;
module.exports.refresh = refresh;
module.exports.invalidate = invalidate;
