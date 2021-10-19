function toHr (time) {
  return time[0] + 's ' + time[1] / 1000000 + 'ms'
}

function addCommas (num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function toHrLength (len) {
  if (len < 1000) {
    return addCommas(len)
  }
  return addCommas(Math.round(len / 10) / 100) + 'K'
}

function reduction (respSize, resChars) {
  return 'Result is ~' + Math.min(Math.round(resChars / respSize * 1.3 * 10000) / 100, 100) + '% of original size'
}

function stats(startTime, reqCreateTime, responseTime, httpTime, readabilityTime, geminifyTime, respSize, resChars) {
  return '# Statistics\n'
  + 'HTTP response size: ' + addCommas(Math.round(respSize / 10) / 100) + ' KB\n'
  + 'Gemini result size: ' + toHrLength(resChars) + ' characters\n'
  + reduction(respSize, resChars) + '\n\n'
  + 'Total processing time: ' + toHr(process.hrtime(startTime)) + '\n'
  + '├─ Total HTTP time: ' + toHr(httpTime) + '\n'
  + '│   ├─ HTTP socket creation time: ' + toHr(reqCreateTime) + '\n'
  + '│   └─ HTTP headers to data time: ' + toHr(responseTime) + '\n'
  + '├─ Readability distill time: ' + toHr(readabilityTime) + '\n'
  + '└─ Geminify time: ' + toHr(geminifyTime)
}

module.exports = stats
