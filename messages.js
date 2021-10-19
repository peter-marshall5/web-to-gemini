module.exports = {
  malformed: '# Malformed request',
  internalDisallowed: '# Denied\nInternal address requests are not allowed.',
  tooLarge: ['# File size greater than limit\n(Limit: ', ' KB)'],
  tooMuchData: ['# Server sent too much data\n(Limit: ', ' KB)'],
  redirect: ['# Redirect (code ', ')', '(Server did not indicate a URL)'],
  returnedCode: 'Server returned code ',
  parseError: '# Error parsing HTML',
  reqError: '# Request failed'
}
