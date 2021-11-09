let levelling = require('../lib/levelling')
let { MessageType } = require('@adiwajshing/baileys')
let fs = require('fs')
let path = require('path')
let fetch = require('node-fetch')
let moment = require('moment-timezone')
const defaultMenu = {
  before: `┏━━⬣
┃❏ Hai : %name
┃❏ Limit : %limit limit
┃❏ Role : %role
┃❏ Level : %level
┃❏ XP : %totalexp EXP
┗━━⬣
┏━━⬣
┃❏ Tanggal: *%week %weton, %date*
┃❏ Tanggal Islam: *%dateIslamic*
┃❏ Waktu: *%time*
┃❏ Uptime: *%uptime (%muptime)*
┃❏ Database: %rtotalreg dari %totalreg
┃❏ Github:
┃❏ %github
┗━━⬣
%readmore`.trimStart(),
  header: '┏━━⬣ %category',
  body: '┃❏ %cmd %islimit %isPremium',
  footer: '┗━━⬣\n',
  after: ``,
}
let handler = async (m, { conn, usedPrefix: _p, args, command }) => {
let img = fs.readFileSync('tmp/logo.jpg')
  let tags
  let teks = `${args[0]}`.toLowerCase()
  let arrayMenu = ['all', 'game', 'xp', 'stiker', 'kerangajaib', 'quotes', 'admin', 'grup', 'premium', 'internet', 'anonymous', 'nulis', 'downloader', 'tools', 'fun', 'database', 'quran', 'audio', 'jadibot', 'info', 'tanpakategori', 'owner']
  if (!arrayMenu.includes(teks)) teks = '404'
  if (teks == 'all') tags = {
    'main': 'Utama',
    'game': 'Game',
    'xp': 'Exp & Limit',
    'sticker': 'Stiker',
    'kerang': 'Kerang Ajaib',
    'quotes': 'Quotes',
    'admin': `Admin ${global.opts['restrict'] ? '' : '(Dinonaktifkan)'}`,
    'group': 'Grup',
    'premium': 'Premium',
    'internet': 'Internet',
    'anonymous': 'Anonymous Chat',
    'nulis': 'MagerNulis & Logo',
    'downloader': 'Downloader',
    'tools': 'Tools',
    'fun': 'Fun',
    'database': 'Database',
    'vote': 'Voting',
    'absen': 'Absen',
    'quran': 'Al Qur\'an',
    'audio': 'Pengubah Suara',
    'jadibot': 'Jadi Bot',
    'info': 'Info',
    '': 'Tanpa Kategori',
  }
  if (teks == 'game') tags = {
    'game': 'Game'
  }
  if (teks == 'xp') tags = {
    'xp': 'Exp & Limit'
  }
  if (teks == 'stiker') tags = {
    'sticker': 'Stiker'
  }
  if (teks == 'kerangajaib') tags = {
    'kerang': 'Kerang Ajaib'
  }
  if (teks == 'quotes') tags = {
    'quotes': 'Quotes'
  }
  if (teks == 'admin') tags = {
    'admin': `Admin ${global.opts['restrict'] ? '' : '(Dinonaktifkan)'}`
  }
  if (teks == 'grup') tags = {
    'group': 'Grup'
  }
  if (teks == 'premium') tags = {
    'premium': 'Premium'
  }
  if (teks == 'internet') tags = {
    'internet': 'Internet'
  }
  if (teks == 'anonymous') tags = {
    'anonymous': 'Anonymous Chat'
  }
  if (teks == 'nulis') tags = {
    'nulis': 'MagerNulis & Logo'
  }
  if (teks == 'downloader') tags = {
    'downloader': 'Downloader'
  }
  if (teks == 'tools') tags = {
    'tools': 'Tools'
  }
  if (teks == 'fun') tags = {
    'fun': 'Fun'
  }
  if (teks == 'database') tags = {
    'database': 'Database'
  }
  if (teks == 'vote') tags = {
    'vote': 'Voting',
    'absen': 'Absen'
  }
  if (teks == 'quran') tags = {
    'quran': 'Al Qur\'an'
  }
  if (teks == 'audio') tags = {
    'audio': 'Pengubah Suara'
  }
  if (teks == 'jadibot') tags = {
    'jadibot': 'Jadi Bot'
  }
  if (teks == 'info') tags = {
    'info': 'Info'
  }
  if (teks == 'tanpakategori') tags = {
    '': 'Tanpa Kategori'
  }
  if (teks == 'owner') tags = {
    'owner': 'Owner',
    'host': 'Host',
    'advanced': 'Advanced'
  }



  try {
    let package = JSON.parse(await fs.promises.readFile(path.join(__dirname, '../package.json')).catch(_ => '{}'))
    let { exp, limit, level, role, registered } = global.db.data.users[m.sender]
    let { min, xp, max } = levelling.xpRange(level, global.multiplier)
    let name = registered ? global.db.data.users[m.sender].name : conn.getName(m.sender)
    let d = new Date(new Date + 3600000)
    let locale = 'id'
    // d.getTimeZoneOffset()
    // Offset -420 is 18.00
    // Offset    0 is  0.00
    // Offset  420 is  7.00
    let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(d / 84600000) % 5]
    let week = d.toLocaleDateString(locale, { weekday: 'long' })
    let date = d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    let dateIslamic = Intl.DateTimeFormat(locale + '-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d)
    let time = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    let _uptime = process.uptime() * 1000
    let _muptime
    if (process.send) {
      process.send('uptime')
      _muptime = await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      }) * 1000
    }
    let muptime = clockString(_muptime)
    let uptime = clockString(_uptime)
    let totalreg = Object.keys(global.db.data.users).length
    let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered == true).length
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
      }
    })
    if (teks == '404') {
function _0x4a30(_0x5b7591,_0x49340d){var _0x407361=_0x4073();return _0x4a30=function(_0x4a30a0,_0x5a568a){_0x4a30a0=_0x4a30a0-0x9e;var _0x4122c9=_0x407361[_0x4a30a0];return _0x4122c9;},_0x4a30(_0x5b7591,_0x49340d);}function _0x4073(){var _0x22e3d1=['2803047CKAmNs','6028650evrBDa','1432686BCWHgg','20NkpOBH','14680fPwLkx','4752660bhDqtU','975437wKWtEZ','2058096giFWJu','10BmTgAj','2989XHDUAf','2hmaqwp'];_0x4073=function(){return _0x22e3d1;};return _0x4073();}(function(_0x4ed745,_0x488169){var _0x52ec52=_0x4a30,_0x6a9455=_0x4ed745();while(!![]){try{var _0x509cf7=-parseInt(_0x52ec52(0x9f))/0x1*(-parseInt(_0x52ec52(0xa3))/0x2)+-parseInt(_0x52ec52(0xa4))/0x3+parseInt(_0x52ec52(0xa0))/0x4+parseInt(_0x52ec52(0xa7))/0x5*(parseInt(_0x52ec52(0xa6))/0x6)+-parseInt(_0x52ec52(0xa2))/0x7*(parseInt(_0x52ec52(0xa8))/0x8)+-parseInt(_0x52ec52(0xa5))/0x9*(parseInt(_0x52ec52(0xa1))/0xa)+parseInt(_0x52ec52(0x9e))/0xb;if(_0x509cf7===_0x488169)break;else _0x6a9455['push'](_0x6a9455['shift']());}catch(_0x36a88d){_0x6a9455['push'](_0x6a9455['shift']());}}}(_0x4073,0x777b9));var capt='Semoga\x20harimu\x20menyenangkan\x20😊\x0aPowered:\x20@6285157489446';
      return conn.relayWAMessage(conn.prepareMessageFromContent(m.chat, {
        "listMessage": {
          "title": `Halo, ${name} 👋\n${ucapan()}`.trim(),
          "description": capt,
          "footerText": global.footer,
          "buttonText": "LIST MENU",
          "listType": "SINGLE_SELECT",
          "sections": [
            {
              "rows": [
                {
                  "title": `• Semua Command`,
                  "description": "",
                  "rowId": `${_p}? all`
                }, {
                  "title": "• Game Menu",
                  "description": "",
                  "rowId": `${_p}? game`

                }, {
                  "title": "• XP Menu",
                  "description": "",
                  "rowId": `${_p}? xp`

                }, {
                  "title": "• Stiker Menu",
                  "description": "",
                  "rowId": `${_p}? stiker`
                }, {
                  "title": "• Kerang Ajaib",
                  "description": "",
                  "rowId": `${_p}? kerangajaib`
                }, {
                  "title": "• Quotes Menu",
                  "description": "",
                  "rowId": `${_p}? quotes`
                }, {
                  "title": "• Admin Menu",
                  "description": "",
                  "rowId": `${_p}? admin`
                }, {
                  "title": "• Grup Menu",
                  "description": "",
                  "rowId": `${_p}? grup`
                }, {
                  "title": "• Premium Menu",
                  "description": "",
                  "rowId": `${_p}? premium`
                }, {
                  "title": "• Internet Menu",
                  "description": "",
                  "rowId": `${_p}? internet`
                }, {
                  "title": "• Anonymous Chat",
                  "description": "",
                  "rowId": `${_p}? anonymous`
                }, {
                  "title": "• Nulis & Logo",
                  "description": "",
                  "rowId": `${_p}? nulis`
                }, {
                  "title": "• Downloader",
                  "description": "",
                  "rowId": `${_p}? downloader`
                }, {
                  "title": "• Tools Menu",
                  "description": "",
                  "rowId": `${_p}? tools`
                }, {
                  "title": "• Fun Menu",
                  "description": "",
                  "rowId": `${_p}? fun`
                }, {
                  "title": "• Database Menu",
                  "description": "",
                  "rowId": `${_p}? database`
                }, {
                  "title": "• Vote & Absen",
                  "description": "",
                  "rowId": `${_p}? vote`
                }, {
                  "title": "• Al-Qur\'an",
                  "description": "",
                  "rowId": `${_p}? quran`
                }, {
                  "title": "• Pengubah Suara",
                  "description": "",
                  "rowId": `${_p}? audio`
                }, {
                  "title": "• Jadi Bot",
                  "description": "",
                  "rowId": `${_p}? jadibot`
                }, {
                  "title": "• Info Menu",
                  "description": "",
                  "rowId": `${_p}? info`
                }, {
                  "title": "• Tanpa Kategori",
                  "description": "",
                  "rowId": `${_p}? tanpakategori`
                }, {
                  "title": "• Owner Menu",
                  "description": "",
                  "rowId": `${_p}? owner`
                }
              ]
            }
          ], "contextInfo": {
"mentionedJid": [`6285157489446@s.whatsapp.net`]
          }
        }
      }, {}), { waitForAck: true })
    }
    // gunakan ini jika kamu menggunakan whatsapp bisnis
    //   throw `
    // ┌〔 DAFTAR MENU 〕
    // ├ ${_p + command} all
    // ├ ${_p + command} game
    // ├ ${_p + command} xp
    // ├ ${_p + command} stiker
    // ├ ${_p + command} kerang
    // ├ ${_p + command} quotes
    // ├ ${_p + command} admin
    // ├ ${_p + command} group
    // ├ ${_p + command} premium
    // ├ ${_p + command} internet
    // ├ ${_p + command} anonymous
    // ├ ${_p + command} nulis
    // ├ ${_p + command} downloader
    // ├ ${_p + command} tools
    // ├ ${_p + command} fun
    // ├ ${_p + command} database
    // ├ ${_p + command} vote
    // ├ ${_p + command} quran
    // ├ ${_p + command} audio
    // ├ ${_p + command} jadibot
    // ├ ${_p + command} info
    // ├ ${_p + command} tanpa kategori
    // ├ ${_p + command} owner
    // └────  
    //     `.trim()
    let groups = {}
    for (let tag in tags) {
      groups[tag] = []
      for (let plugin of help)
        if (plugin.tags && plugin.tags.includes(tag))
          if (plugin.help) groups[tag].push(plugin)
      // for (let tag of plugin.tags)
      //   if (!(tag in tags)) tags[tag] = tag
    }
    conn.menu = conn.menu ? conn.menu : {}
    let before = conn.menu.before || defaultMenu.before
    let header = conn.menu.header || defaultMenu.header
    let body = conn.menu.body || defaultMenu.body
    let footer = conn.menu.footer || defaultMenu.footer
    let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '' : `Dipersembahkan oleh https://wa.me/${global.conn.user.jid.split`@`[0]}`) + defaultMenu.after
    let _text = [
      before,
      ...Object.keys(tags).map(tag => {
        return header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
            return menu.help.map(help => {
              return body.replace(/%cmd/g, menu.prefix ? help : '%p' + help)
                .replace(/%islimit/g, menu.limit ? '(Limit)' : '')
                .replace(/%isPremium/g, menu.premium ? '(Premium)' : '')
                .trim()
            }).join('\n')
          }),
          footer
        ].join('\n')
      }),
      after
    ].join('\n')
    text = typeof conn.menu == 'string' ? conn.menu : typeof conn.menu == 'object' ? _text : ''
    let replace = {
      '%': '%',
      p: _p, uptime, muptime,
      me: conn.user.name,
      npmname: package.name,
      npmdesc: package.description,
      version: package.version,
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp <= 0 ? `Siap untuk *${_p}levelup*` : `${max - exp} XP lagi untuk levelup`,
      github: package.homepage ? package.homepage.url || package.homepage : '[unknown github url]',
      level, limit, name, weton, week, date, dateIslamic, time, totalreg, rtotalreg, role,
      readmore: readMore
    }
    text = text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])

var _0x16a5dc=_0x4a56;function _0x4a56(_0x185e08,_0xe52a4a){var _0x121ebb=_0x121e();return _0x4a56=function(_0x4a560a,_0x42724c){_0x4a560a=_0x4a560a-0x151;var _0x54cac2=_0x121ebb[_0x4a560a];return _0x54cac2;},_0x4a56(_0x185e08,_0xe52a4a);}(function(_0xc881c6,_0x197207){var _0x3853a8=_0x4a56,_0x16056c=_0xc881c6();while(!![]){try{var _0x5638b6=-parseInt(_0x3853a8(0x155))/0x1+parseInt(_0x3853a8(0x153))/0x2*(parseInt(_0x3853a8(0x157))/0x3)+parseInt(_0x3853a8(0x158))/0x4+-parseInt(_0x3853a8(0x15d))/0x5*(-parseInt(_0x3853a8(0x15c))/0x6)+parseInt(_0x3853a8(0x15a))/0x7*(parseInt(_0x3853a8(0x15e))/0x8)+-parseInt(_0x3853a8(0x152))/0x9+parseInt(_0x3853a8(0x154))/0xa;if(_0x5638b6===_0x197207)break;else _0x16056c['push'](_0x16056c['shift']());}catch(_0xe92546){_0x16056c['push'](_0x16056c['shift']());}}}(_0x121e,0x873ba),await conn[_0x16a5dc(0x151)](m[_0x16a5dc(0x156)],img,text['trim'](),global['footer'],_0x16a5dc(0x159),_p+'owner',_0x16a5dc(0x15b),_p+'sc',m));function _0x121e(){var _0x1e32fe=['OWNER','1432193Ltvinj','SCRIPT','2236998zOLaaC','10tcLgWg','8YeRzYY','send2Loc','9790686PwvyCc','10UrYYqe','6004270TOQXBc','465654iYcjsQ','chat','267321DbvsEw','444780qcnXLr'];_0x121e=function(){return _0x1e32fe;};return _0x121e();}
  } catch (e) {
    conn.reply(m.chat, 'Maaf, menu sedang error', m)
    throw e
  }
}
handler.help = ['menu', 'help', '?']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i
handler.owner = false
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false

handler.admin = false
handler.botAdmin = false

handler.fail = null
handler.exp = 3

module.exports = handler

const more = String.fromCharCode(1)
const readMore = more.repeat(1)

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
function ucapan() {
  const time = moment.tz('Asia/Jakarta').format('HH')
  res = "Selamat dinihari"
  if (time >= 4) {
    res = "Selamat pagi"
  }
  if (time > 10) {
    res = "Selamat siang"
  }
  if (time >= 15) {
    res = "Selamat sore"
  }
  if (time >= 18) {
    res = "Selamat malam"
  }
  return res
}
