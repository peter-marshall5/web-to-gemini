const { JSDOM } = require('jsdom')

const common = require('./common.js')

let bold = false
let italics = false
let underline = false
let newline = false

function geminify (article, req) {
  const doc = new JSDOM(article.content.replace(/\t/g, ''))
  const pages = doc.window.document.body
  // const pages = doc.window.document.querySelectorAll('article')
  // console.log(pages[0].innerHTML)
  let result = ''
  if (article.title) result += '# ' + article.title + '\n'
  result += analyzePage(pages, req).replace(/^\n/, '')
  //console.log('Geminify result:', result)
  return result
}

function analyzePage (page, req) {
  let result = ''
  for (let i = 0; i < page.childNodes.length; i++) {
    if (page.childNodes[i].nodeName == 'IMG') {
      if (!newline) result += '\n'
      result += '=> ' + common.getImageSrc(page.childNodes[i], req) + ' ' + (page.childNodes[i].alt || '[Image]').replace(/\n/g, '') + '\n'
      newline = true
    }
    if (page.childNodes[i].childNodes && page.childNodes[i].childNodes.length > 0) {
      // console.log('not the end', page.children[i].nodeName, page.children[i].innerHTML)
      result += analyzePage(page.childNodes[i], req)
    } else {
      switch (page.nodeName) {
        case 'A':
        //console.log('Newline for link:', newline)
        if (!newline) result += '\n'
        result += '=> ' + common.parseURL(page.childNodes[i].parentNode.href, req) + ' ' + (page.childNodes[i].nodeValue || page.childNodes[i].parentNode.href).replace(/\n/g, '') + '\n'
        newline = true
        break
        case 'LI':
        if (page.childNodes[i].nodeValue && !/\n/.test(page.childNodes[i].nodeValue)) {
          if (!newline) result += '\n'
          result += '* ' + page.childNodes[i].nodeValue.replace(/\n/g, '\n* ') + '\n'
          newline = true
        }
        break
        case 'H1':
        case 'H2':
        case 'H3':
        if (page.childNodes[i].nodeValue && !/\n/.test(page.childNodes[i].nodeValue)) {
          if (!newline) result += '\n'
          result += '# ' + page.childNodes[i].nodeValue.replace(/\n/g, '\n# ') + '\n'
          newline = true
        }
        break
        case 'P':
        // if (!newline) result += '\n'
        result += (page.childNodes[i].nodeValue || '').replace(/[\ ]+/g, ' ') + ' '
        // + '\n'
        // newline = true
        newline = result.endsWith('\n')
        break
        case 'CODE':
        if (!newline) result += '\n'
        result += '```\n' + (page.childNodes[i].nodeValue || '').replace(/```/g, '``') + '\n```\n'
        newline = true
        break
        default:
        if (page.childNodes[i].nodeValue && page.childNodes[i].nodeValue != '\n') {
          if (newline) {
            result += page.childNodes[i].nodeValue.replace(/\n/, '').replace(/[\n]+/g, '\n').replace(/\t/g, '').replace(/[\ ]+/g, ' ')
          } else {
            result += page.childNodes[i].nodeValue.replace(/[\n]+/g, '\n').replace(/\t/g, '').replace(/[\ ]+/g, ' ')
          }
          newline = result.endsWith('\n')
        }
      }
      //console.log('end', page.childNodes[i].childNodes.length, page.childNodes[i].nodeValue)
    }
  }
  return result.replace(/[\n]+/g, '\n').replace(/\n[\ ]+/g, '\n')
}

module.exports = geminify
