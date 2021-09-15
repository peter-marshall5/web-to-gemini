const config = require('./config.js')

function parseURL (raw, req) {
  if (raw.startsWith('/')) {
    return req.host + req.scheme + '/~' + req.hostname + raw.replace(/\n/g, '')
  } else {
    return raw.replace('gemini://replaceme', req.host + req.scheme + '/~' + req.hostname).replace('https://', req.host + 'https/~').replace('http://', req.host + 'http/~').replace(/\n/g, '')
  }
}

function getImageSrc (img, req) {
  if (img.dataset.src) {
    return parseURL((img.dataset.src || 'unknown') + '.svg', req)
  } else {
    return parseURL(img.src || 'unknown', req)
  }
}

module.exports = {
  host: 'gemini://' + config.host + '/proxy/',
  parseURL: parseURL,
  getImageSrc: getImageSrc
}
