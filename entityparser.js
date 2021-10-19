const table = {
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
}

function parseEntity(entity, entityCode) {
  let match
  if (entityCode in table) {
    return table[entityCode]
  } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
    return String.fromCharCode(parseInt(match[1], 16))
  } else if (match = entityCode.match(/^#(\d+)$/)) {
      return String.fromCharCode(~~match[1])
    } else {
    return entity;
  }
}

module.exports = (text) => {
  return text.replace(/\&([^;]{1,5});/g, parseEntity).replace(/\&#\+([^;]{1,4});/g, parseEntity)
}
