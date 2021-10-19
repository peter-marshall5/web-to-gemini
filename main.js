const fs = require('fs')
const gemini = require('./gemini-server')
const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const http = require('http')
const https = require('https')

const geminify = require('./geminify.js')
const common = require('./common.js')
const stats = require('./stats.js')
const config = require('./config.js')

const messages = require('./messages.js')

const maxPageSize = config.sizelimit || 100000 // 100KB default

const app = gemini({cert: fs.readFileSync(config.cert),
key: fs.readFileSync(config.key)})

app.on('/', (req, res) => {
  res.file('www/index.gemini')
})

app.on('*', function(req, res) {
  if (!req.path) {
    res.file('www/index.gemini')
    return
  }
  const pathParts = req.path.split('/')
  if (pathParts.length < 4) {
    res.data(messages.malformed, mimeType='text/gemini')
    return
  }

  return new Promise((resolve, reject) => {
    if (req.path.startsWith('/proxy/')) {
      const scheme = pathParts[2]
      const hostnameParts = unescape(pathParts[3].slice(1)).split(':')
      const hostname = hostnameParts[0]
      const port = hostnameParts[1] || (scheme == 'https' ? 443 : 80)
      const path = pathParts.slice(4, pathParts.length).join('/')

      const reqInfo = {host: common.host, scheme: scheme, hostname: unescape(pathParts[3].slice(1))}

      if (hostname == 'localhost' || hostname.startsWith('192.168') || hostname.startsWith('10.0')) {
        res.data(messages.internalDisallowed, mimeType='text/gemini')
        resolve()
        return
      }

      console.log('Requested', hostname + ':' + port + '/' + path)
      const startTime = process.hrtime()

      const options = {
        hostname: hostname,
        port: port,
        path: '/' + path,
        method: 'GET',
        encoding: null,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
        }
      }

      const req2 = (scheme == "https" ? https : http).request(options, res2 => {
        const reqCreateTime = process.hrtime(startTime)
        const responseTimeStart = process.hrtime()

        let aborted = false

        if (typeof res2.headers['content-length'] === 'string' && res2.headers['content-length'] > maxPageSize) {
          res.data(messages.tooLarge[0] + (maxPageSize / 1000) + messages.tooLarge[1], mimeType='text/gemini')
          console.log('Content-length header over limit')
          resolve()
          req2.abort()
          aborted = true
        }

        let data = []
        let totalLength = 0
        res2.on('data', chunk => {
          //console.log(chunk.length, totalLength, res2.headers)
          totalLength += chunk.length
          if (totalLength > maxPageSize) {
            res.data(messages.tooMuchData[0] + (maxPageSize / 1000) + messages.tooMuchData[1], mimeType='text/gemini')
            console.log('Server sent too much data')
            resolve()
            req2.abort()
            aborted = true
            return
          }
          data.push(chunk)
        })
        res2.on('end', _ => {
          if (aborted) return
          console.log('Got response')
          const responseTime = process.hrtime(responseTimeStart)
          const httpTime = process.hrtime(startTime)
          const domParseTimeStart = process.hrtime()
          const buffer = Buffer.concat(data)
          //console.log(buffer.toString())
          if (res2.statusCode >= 300 && res2.statusCode < 400) {
            if (res2.headers.location) {
              res.data(messages.redirect[0] + res2.statusCode + messages.redirect[1] + '\n=> ' + common.parseURL(res2.headers.location, reqInfo) + ' ' + res2.headers.location, mimeType='text/gemini')
            } else {
              res.data(messages.redirect[0] + '\n' + res2.statusCode + messages.redirect[1] + messages.redirect[2], mimeType='text/gemini')
            }
            resolve()
          } else if (res2.headers['content-type'] && res2.headers['content-type'].startsWith('text/html') || !res2.headers['content-type']) {
            let doc = new JSDOM(buffer.toString(), {url: 'gemini://replaceme/' + path})
            const domParseTime = process.hrtime(domParseTimeStart)
            const readabilityTimeStart = process.hrtime()
            let reader = new Readability(doc.window.document)
            let article = reader.parse()
            if (article !== null) {
              console.log('Article parse complete')
              const readabilityTime = process.hrtime(readabilityTimeStart)
              const geminifyTimeStart = process.hrtime()
              //console.log('Article:', article)
              const geminified = geminify(article, reqInfo)
              const geminifyTime = process.hrtime(geminifyTimeStart)
              const statsText = '\n' + stats(startTime, reqCreateTime, responseTime, httpTime, readabilityTime, geminifyTime, totalLength, geminified.length)
              if (res2.statusCode == 200) {
                res.data(geminified + statsText, mimeType='text/gemini')
              } else {
                res.data('(' + messages.returnedCode + res2.statusCode + ')\n' + geminified + starsText, mimeType='text/gemini')
              }
              console.log('Returned response')
            } else {
              res.data(messages.parseError + '\n(' + messages.returnedCode + res2.statusCode + ')', mimeType='text/gemini')
              console.log('Error parsing HTML')
            }
            resolve()
          } else if (res2.statusCode != 200) {
            res.data(messages.reqError + '\n(' + messages.returnedCode + res2.statusCode + ')')
            resolve()
          } else {
            console.log(res2.headers['content-type'])
            res.data(buffer, mimeType=res2.headers['content-type'])
            console.log('Sent binary')
            //console.log(Buffer.from(buffer.toString('binary'), 'utf8').toString('hex'))
            resolve()
          }
        })
      })

      req2.on('error', error => {
        console.log(error)
        res.data(messages.reqError + '\n' + error, mimeType='text/gemini')
        resolve()
      })

      console.log('Sending request')
      req2.end()
    } else {
      resolve()
    }
  })
})

// app.on('*', (req, res) =>  {
//   console.log('on')
//   res.data('a')
// })

app.listen(() => {
  console.log("Started server")
}, config.port);
