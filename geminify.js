const { JSDOM } = require('jsdom')

const common = require('./common.js')
const parseEntity = require('./entityparser.js')

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
  // .replace(/[\n]+/g, '\n').replace(/\n[\ ]+/g, '\n')
  // console.log('Geminify result:', result)
  return result
}

function isText (text) {
  if (!text) return false
  for (let i = 0; i < text.length; i++) {
    if (text[i] != '\n' && text[i] != ' ') return true
  }
  return false
}

function endsWithWhitespace (text) {
  return text.endsWith('\n') || text.endsWith(' ')
}

function startsWithWhitespace (text) {
  return parseEntity(text).startsWith('\n') || text.startsWith(' ')
}

function oneLine (text) {
  return parseEntity(text).replace(/\n/g, '').replace(/[\ ]+/g, ' ').replace(/^\s/, '').replace(/\s$/, '')
}

function removeWhitespace (text) {
  return ((startsWithWhitespace(text) && !newline) ? ' ' : '') + parseEntity(text).replace(/^[\s]+/, '').replace(/[\s]+$/, '').replace(/[\n]+/g, '\n').replace(/[\s]+/g, ' ').replace(/\t/g, '') + (endsWithWhitespace(text) ? ' ' : '')
}

function getLinkText (link) {
  if (link.children[0] && link.children[0].nodeName == 'IMG') return link.children[0].alt
  if (!link.children[0]) return link.innerHTML
  if (link.childNodes[0] && link.childNodes[0].nodeValue) return link.childNodes[0].nodeValue
  return
}

function addLink (url, text) {
  return '=> ' + oneLine(url) + ' ' + oneLine(text) + '\n'
}

function addBullets (lines) {
  return '* ' + lines.replace(/\n/g, '\n* ') + '\n'
}

function addHeading (heading) {
  return '# ' + heading.replace(/\n/g, '\n# ') + '\n'
}

function addCode (code) {
  return '```\n' + code.replace(/```/g, '``') + '\n```\n'
}

function addText (text) {
  return (newline ? '' : ' ') + removeWhitespace(text)
}

function analyzePage (page, req) {
  let result = ''
  switch (page.nodeName) {
    case '#text':
    if (isText(page.nodeValue)) {
      result += addText(page.nodeValue)
      newline = result.endsWith('\n')
    }
    break
    case 'IMG':
    if (!newline) result += '\n'
    result += addLink(common.getImageSrc(page, req), (page.alt || '[Image]'))
    newline = true
    break
    case 'A':
    if (!page.href.startsWith('about:')) {
      if (!newline) result += '\n'
      const parsed = common.parseURL(page.href, req)
      result += addLink(parsed, (getLinkText(page) || parsed))
      newline = true
    }
    break
    case 'LI':
    if (isText(page.innerText)) {
      // console.log('li', page)
      if (!newline) result += '\n'
      result += addBullets(page.innerText)
      newline = true
      break
    }
    case 'H1':
    case 'H2':
    case 'H3':
    if (page.children.length == 0 &&
      page.childNodes[0] && isText(page.childNodes[0].textContent)) {
      if (!newline) result += '\n'
      if (isText(page.childNodes[0].textContent)) result += addHeading(page.childNodes[0].textContent)
      newline = true
      break
    }
    case 'CODE':
    case 'PRE':
    if (page.children.length == 0) {
    if (!newline) result += '\n'
      result += addCode(page.innerHTML || '')
      newline = true
      break
    }
    default:
    for (let i = 0; i < page.childNodes.length; i++) {
      result += analyzePage(page.childNodes[i], req)
      switch (page.childNodes[i].nodeName) {
        case 'P':
        case 'FIGURE':
        // Exited from paragraph
        if (!newline) {
          result += '\n'
          newline = true
        }
      }
    }
  }
  return result
  // .replace(/[\n]+/g, '\n').replace(/\n[\ ]+/g, '\n')
}

module.exports = geminify
