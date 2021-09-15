const fs = require('fs')
const gemini = require('./gemini-server')
const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const http = require('http')
const https = require('https')

const geminify = require('./geminify.js')
const common = require('./common.js')
const config = require('./config.js')

const app = gemini({cert: fs.readFileSync(config.cert),
key: fs.readFileSync(config.key)})

app.on('/', (req, res) => {
  res.file('www/index.gemini')
})

app.on('*', function(req, res) {
  const pathParts = req.path.split('/')
  return new Promise((resolve, reject) => {
    //console.log(req.path)
    if (req.path.startsWith('/proxy/')) {
      const scheme = pathParts[2]
      const hostnameParts = unescape(pathParts[3].slice(1)).split(':')
      const hostname = hostnameParts[0]
      const port = hostnameParts[1] || (scheme == 'https' ? 443 : 80)
      const path = pathParts.slice(4, pathParts.length).join('/')

      const reqInfo = {host: common.host, scheme: scheme, hostname: unescape(pathParts[3].slice(1))}

      console.log('Requested', hostname + ':' + port + '/' + path)

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
        //console.log(res2.headers['content-type'])
        //console.log(`statusCode: ${res2.statusCode}`)

        let data = []
        res2.on('data', chunk => {
          data.push(chunk)
        })
        res2.on('end', _ => {
          console.log('Got response')
          const buffer = Buffer.concat(data)
          //console.log(buffer.toString())
          if (res2.statusCode >= 300 && res2.statusCode < 400) {
            if (res2.headers.location) {
              res.data('# Redirect (code ' + res2.statusCode + ')\n=> ' + common.parseURL(res2.headers.location, reqInfo) + ' ' + res2.headers.location, mimeType='text/gemini')
            } else {
              res.data('# Redirect (code ' + res2.statusCode + ')\n(Server did not indicate a URL)', mimeType='text/gemini')
            }
            resolve()
          } else if (res2.headers['content-type'] && res2.headers['content-type'].startsWith('text/html') || !res2.headers['content-type']) {
            let doc = new JSDOM(buffer.toString(), {url: 'gemini://replaceme/' + path})
            let reader = new Readability(doc.window.document);
            let article = reader.parse()
            if (article !== null) {
              //console.log('Article:', article)
              if (res2.statusCode == 200) {
                res.data(geminify(article, reqInfo), mimeType='text/gemini')
              } else {
                res.data('(Server returned code ' + res2.statusCode + ')\n' + geminify(article, reqInfo), mimeType='text/gemini')
              }
              console.log('Returned response')
            } else {
              res.data('# Error parsing HTML\n(Server returned code ' + res2.statusCode + ')', mimeType='text/gemini')
              console.log('Error parsing HTML')
            }
            resolve()
          } else if (res2.statusCode != 200) {
            res.data('# Error\n(Server returned code ' + res2.statusCode + ')')
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
        res.data('# Request failed\n' + error, mimeType='text/gemini')
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
});
