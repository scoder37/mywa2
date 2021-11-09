let { spawn } = require('child_process');
let handler = async (m, { conn }) => {
if (!process.send) throw 'Dont: node main.js\nDo: node index.js'
if (global.conn.user.jid == conn.user.jid) {

setTimeout(async () => {
m.reply('Bot sukses direstart')
}, 1000)

await m.reply(`Bot sedang di restart...`)
await global.db.write()
process.send('reset')

} else throw '_eeeeeiiittsssss..._'
}

handler.help = ['restart' + (process.send ? '' : ' (Tidak Bekerja)')]
handler.tags = ['host']
handler.command = /^restart$/i
handler.owner = true
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.fail = null
module.exports = handler

