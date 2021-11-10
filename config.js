//- List module

let fs = require('fs')
let d = new Date(new Date + 3600000)
let locale = 'id'
let week = d.toLocaleDateString(locale, { weekday: 'long' })
let date = d.toLocaleDateString(locale, {
day: 'numeric',
month: 'long',
year: 'numeric'
})

let time = d.toLocaleTimeString(locale, {
hour: 'numeric',
minute: 'numeric',
second: 'numeric'
})

// - JANGAN DIEDIT KALAU GAMAU EROR
var _0xdfb6c3=_0x3935;function _0x3935(_0x302710,_0x3352be){var _0x2264ae=_0x2264();return _0x3935=function(_0x39358a,_0x32c8b1){_0x39358a=_0x39358a-0x1c5;var _0x1f74f7=_0x2264ae[_0x39358a];return _0x1f74f7;},_0x3935(_0x302710,_0x3352be);}(function(_0x4e2404,_0x130164){var _0x52fbe9=_0x3935,_0x494578=_0x4e2404();while(!![]){try{var _0x30fcbb=-parseInt(_0x52fbe9(0x1cd))/0x1+parseInt(_0x52fbe9(0x1ca))/0x2*(parseInt(_0x52fbe9(0x1c7))/0x3)+-parseInt(_0x52fbe9(0x1c9))/0x4+parseInt(_0x52fbe9(0x1cc))/0x5+parseInt(_0x52fbe9(0x1c5))/0x6*(-parseInt(_0x52fbe9(0x1cb))/0x7)+parseInt(_0x52fbe9(0x1c8))/0x8*(parseInt(_0x52fbe9(0x1cf))/0x9)+parseInt(_0x52fbe9(0x1c6))/0xa;if(_0x30fcbb===_0x130164)break;else _0x494578['push'](_0x494578['shift']());}catch(_0x405cd6){_0x494578['push'](_0x494578['shift']());}}}(_0x2264,0xbac33),global[_0xdfb6c3(0x1ce)]=_0xdfb6c3(0x1d0));function _0x2264(){var _0x19275b=['Made\x20by\x20Amirul\x20Dev','48pivWQc','12180270uNKsiN','1169760UJWbAC','5562064bccGOq','1191980jVOnpS','2omcJeO','422618MfJmos','3332545zrirfF','1423748irNNQm','footer','9jaMwIQ'];_0x2264=function(){return _0x19275b;};return _0x2264();}
function _0x4227(){var _0x247a9c=['3QfQsqg','15410eTfEFR','1395035Qagfbe','2472528GzNBxk','37423NbWcci','1158878vzthSH','1219772laPTXn','2291274ihsyHM','6yDeaXW','desc'];_0x4227=function(){return _0x247a9c;};return _0x4227();}var _0x4f9750=_0x5bc2;function _0x5bc2(_0x3939dd,_0x4092c1){var _0x4227f9=_0x4227();return _0x5bc2=function(_0x5bc2dc,_0x1b99bc){_0x5bc2dc=_0x5bc2dc-0x183;var _0x471b2a=_0x4227f9[_0x5bc2dc];return _0x471b2a;},_0x5bc2(_0x3939dd,_0x4092c1);}(function(_0x5d5909,_0x4e4d6f){var _0x41d93f=_0x5bc2,_0x1ad48a=_0x5d5909();while(!![]){try{var _0x319b7d=-parseInt(_0x41d93f(0x18c))/0x1+parseInt(_0x41d93f(0x189))/0x2+-parseInt(_0x41d93f(0x188))/0x3*(parseInt(_0x41d93f(0x184))/0x4)+-parseInt(_0x41d93f(0x18a))/0x5*(-parseInt(_0x41d93f(0x186))/0x6)+parseInt(_0x41d93f(0x183))/0x7+parseInt(_0x41d93f(0x18b))/0x8+-parseInt(_0x41d93f(0x185))/0x9;if(_0x319b7d===_0x4e4d6f)break;else _0x1ad48a['push'](_0x1ad48a['shift']());}catch(_0x3a1e0d){_0x1ad48a['push'](_0x1ad48a['shift']());}}}(_0x4227,0x2821c),global[_0x4f9750(0x187)]='Made\x20by\x20Amirul\x20Dev');



//- SETTINGNYA DISINI
let a = '```'
global.pict = 'https://telegra.ph/file/7a500b34519811d5c55dc.jpg'
global.name = 'MyWA'
global.sw = ["6285157489446", "62895604187905", " 6287676716773"]
global.dev = `Amirul Dev`
global.browser = 'Firefox'
global.version = '1.0.6'
global.capt = ['Halo, terimakasih telah menggunakan bot ini, jangan lupa dukung bot ini dengan cara donasi yah', 'Terimakasih telah menggunakan bot ini, dimohon mematuhi semua rules dan tidak spam ke bot, happy boters guys 😊', 'Hai 👋/nthanks uda menggunakan bot ini, apabila ada fitur yang eror atau bug, silahkan lapor ke owner langsung yah', 'Hai kak 👋\nHave a nice day. gunakan bot sewajarnya aja yah.. jangan spam dan jangan diperjual belikan, bot ini gratis tidak ada unsur sewa²an kecuali fitur fitur tertentu!!']

// WM STIKER
global.packname = 'Created By Wabot Plus+️'
global.author = 'me'

// RESPON
global.wait = 'Permintaan sedang diproses...'
global.eror = 'Server Error'

global.fla = 'https://www6.flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=sketch-name&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&fillTextType=1&fillTextPattern=Warning!&text='

global.CanvasAPI = '';

global.multiplier = 69 // Semakin tinggi, semakin sulit naik level

global.owner = ['6285157489446', '62812359515521'] // Owner

global.mods = [] // Moderator

global.prems = JSON.parse(fs.readFileSync('./src/premium.json')) // Premium

global.APIs = { // API Prefix
am: 'https://amdev.herokuapp.com/api/',
}
global.APIKeys = { // APIKey nya disini
'https://amdev.herokuapp.com/api/': 'renz',
}

let chalk = require('chalk')
let file = require.resolve(__filename)
fs.watchFile(file, () => {

fs.unwatchFile(file)

console.log(chalk.redBright("Update 'config.js'"))

delete require.cache[file]
require(file)

})

