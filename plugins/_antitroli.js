let handler = m => m
let fs = require('fs')
handler.all = async function (m) {
if (!db.data.settings[this.user.jid].antispam) return // antitroli aktif?

if (m.message && m.isBaileys && m.quoted && m.quoted.mtype === 'orderMessage' && !(m.quoted.token && m.quoted.orderId)) {
m.reply('Troli Terdeteksi\n\n' + require('util').format(m.key), null)

await this.modifyChat(m.chat, 'clear', {
includeStarred: false
}).catch(console.log)
let img = fs.readFileSync('tmp/logo.jpg')
this.sendLoc(global.owner[0] + '@s.whatsapp.net', img, `*Anti Troli*

Pengirim: @${m.sender.split`@`[0]}
ID: ${m.isGroup ? m.chat : m.sender}
Nama: ${m.isGroup ? this.getName(m.chat) : this.getName(m.sender)}
`, global.footer, 'LIST MENU', '#menu', null, { contextInfo: { mentionedJid: [m.sender] } })

}

}

module.exports = handler

