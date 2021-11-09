const fs = require('fs')
const util = require('util')
const path = require('path')
const request = require('request')
const FileType = require('file-type')
const fetch = require('node-fetch')
const got = require('got')
const { exec } = require('child_process')
const PhoneNumber = require('awesome-phonenumber')
const { tmpdir } = require('os')
const {
  MessageType,
  WAMessageProto,
  DEFAULT_ORIGIN,
  getAudioDuration,
  MessageTypeProto,
  MediaPathMap,
  Mimetype,
  MimetypeMap,
  compressImage,
  generateMessageID,
  randomBytes,
  getMediaKeys,
  aesEncrypWithIV,
  hmacSign,
  sha256,
  encryptedStream
} = require('@adiwajshing/baileys')
const { toAudio, toPTT, toVideo } = require('./converter')
const { WAConnection } = require('@adiwajshing/baileys/lib/WAConnection/0.Base')

exports.WAConnection = _WAConnection => {
  class WAConnection extends _WAConnection {
    constructor(...args) {
      super(...args)
      if (!Array.isArray(this._events['CB:action,add:relay,message'])) this._events['CB:action,add:relay,message'] = [this._events['CB:action,add:relay,message']]
      else this._events['CB:action,add:relay,message'] = [this._events['CB:action,add:relay,message'].pop()]
      this._events['CB:action,add:relay,message'].unshift(async function (json) {
        try {
          let m = json[2][0][2]
          if (m.message && m.message.protocolMessage && m.message.protocolMessage.type == 0) {
            let key = m.message.protocolMessage.key
            let c = this.chats.get(key.remoteJid)
            let a = c.messages.dict[`${key.id}|${key.fromMe ? 1 : 0}`]
            let participant = key.fromMe ? this.user.jid : a.participant ? a.participant : key.remoteJid
            let WAMSG = WAMessageProto.WebMessageInfo
            this.emit('message-delete', { key, participant, message: WAMSG.fromObject(WAMSG.toObject(a)) })
          }
        } catch (e) { }
      })
      this.on(`CB:action,,battery`, json => {
        this.battery = Object.fromEntries(Object.entries(json[2][0][1]).map(v => [v[0], eval(v[1])]))
      })


      // Alias
      this.sendFileFromUrl = this.sendFileFromURL = this.sendFile
    }

    /**
     * Exact Copy Forward
     * @param {String} jid
     * @param {Object} message
     * @param {Boolean} forceForward
     * @param {Object} options
     */
    async copyNForward(jid, message, forceForward = false, options = {}) {
      let vtype
      if (options.readViewOnce) {
        message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
        vtype = Object.keys(message.message.viewOnceMessage.message)[0]
        delete (message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
        delete message.message.viewOnceMessage.message[vtype].viewOnce
        message.message = {
          ...message.message.viewOnceMessage.message
        }
      }
      let mtype = Object.keys(message.message)[0]
      let content = await this.generateForwardMessageContent(message, forceForward)
      let ctype = Object.keys(content)[0]
      let context = {}
      if (mtype != MessageType.text) context = message.message[mtype].contextInfo
      content[ctype].contextInfo = {
        ...context,
        ...content[ctype].contextInfo
      }
      const waMessage = await this.prepareMessageFromContent(jid, content, options ? {
        ...content[ctype],
        ...options,
        ...(options.contextInfo ? {
          contextInfo: {
            ...content[ctype].contextInfo,
            ...options.contextInfo
          }
        } : {})
      } : {})
      await this.relayWAMessage(waMessage)
      return waMessage
    }

    /**
    * cMod
    * @param {String} jid 
    * @param {*} message 
    * @param {String} text 
    * @param {String} sender 
    * @param {*} options 
    * @returns 
    */
    cMod(jid, message, text = '', sender = this.user.jid, options = {}) {
      let copy = message.toJSON()
      let mtype = Object.keys(copy.message)[0]
      let isEphemeral = mtype === 'ephemeralMessage'
      if (isEphemeral) {
        mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
      }
      let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
      let content = msg[mtype]
      if (typeof content === 'string') msg[mtype] = text || content
      else if (content.caption) content.caption = text || content.caption
      else if (content.text) content.text = text || content.text
      if (typeof content !== 'string') msg[mtype] = { ...content, ...options }
      if (copy.participant) sender = copy.participant = sender || copy.participant
      else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
      if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
      else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
      copy.key.remoteJid = jid
      copy.key.fromMe = sender === this.user.jid
      return WAMessageProto.WebMessageInfo.fromObject(copy)
    }

    /**
     * genOrderMessage
     * @param {String} message 
     * @param {*} options 
     * @returns 
     */
    async genOrderMessage(message, options) {
      let m = {}
      switch (type) {
        case MessageType.text:
        case MessageType.extendedText:
          if (typeof message === 'string') message = { text: message }
          m.extendedTextMessage = WAMessageProto.ExtendedTextMessage.fromObject(message);
          break
        case MessageType.location:
        case MessageType.liveLocation:
          m.locationMessage = WAMessageProto.LocationMessage.fromObject(message)
          break
        case MessageType.contact:
          m.contactMessage = WAMessageProto.ContactMessage.fromObject(message)
          break
        case MessageType.contactsArray:
          m.contactsArrayMessage = WAMessageProto.ContactsArrayMessage.fromObject(message)
          break
        case MessageType.groupInviteMessage:
          m.groupInviteMessage = WAMessageProto.GroupInviteMessage.fromObject(message)
          break
        case MessageType.listMessage:
          m.listMessage = WAMessageProto.ListMessage.fromObject(message)
          break
        case MessageType.buttonsMessage:
          m.buttonsMessage = WAMessageProto.ButtonsMessage.fromObject(message)
          break
        case MessageType.image:
        case MessageType.sticker:
        case MessageType.document:
        case MessageType.video:
        case MessageType.audio:
          m = await this.prepareMessageMedia(message, type, options)
          break
        case 'orderMessage':
          m.orderMessage = WAMessageProto.OrderMessage.fromObject(message)
      }
      return WAMessageProto.Message.fromObject(m);
    }

    /**
     * waitEvent
     * @param {*} eventName 
     * @param {Boolean} is 
     * @param {Number} maxTries 
     * @returns 
     */
    waitEvent(eventName, is = () => true, maxTries = 25) {
      return new Promise((resolve, reject) => {
        let tries = 0
        let on = (...args) => {
          if (++tries > maxTries) reject('Max tries reached')
          else if (is()) {
            this.off(eventName, on)
            resolve(...args)
          }
        }
        this.on(eventName, on)
      })
    }


/*
###################################
# FUNCTION BUTTON BY AMIRUL DEV         #
###################################
*/

/*
|------------------------------------------------|
| SEND BUTTON                                             |
| Id, Content, Footer, Button, Command,         |
| Quoted, Option                                            |
|------------------------------------------------|
*/

//- SEND BUTTON 1
async sendBtn(jid, content, footer, button1, row1, quoted, options = {}) {
      function _0x54fe(){var _0x398264=['1864431QnqZSZ','sendMessage','94322yYgDbm','6CsAZvn','17922320QnxmzZ','52MwyhHU','buttonsMessage','1612935ndUUOQ','8JUIsZS','5223533CcIXxu','143433QNlZuD','5961696gTDtRz'];_0x54fe=function(){return _0x398264;};return _0x54fe();}function _0x5c12(_0x4a2f52,_0x23ead4){var _0x54feb6=_0x54fe();return _0x5c12=function(_0x5c1221,_0x2b085f){_0x5c1221=_0x5c1221-0x1ac;var _0x632c8b=_0x54feb6[_0x5c1221];return _0x632c8b;},_0x5c12(_0x4a2f52,_0x23ead4);}var _0x50459c=_0x5c12;(function(_0x253a41,_0x1f4a98){var _0x1cc688=_0x5c12,_0x172945=_0x253a41();while(!![]){try{var _0x2cfe83=parseInt(_0x1cc688(0x1b0))/0x1*(-parseInt(_0x1cc688(0x1b6))/0x2)+-parseInt(_0x1cc688(0x1ac))/0x3*(-parseInt(_0x1cc688(0x1b3))/0x4)+-parseInt(_0x1cc688(0x1b5))/0x5*(-parseInt(_0x1cc688(0x1b1))/0x6)+parseInt(_0x1cc688(0x1b7))/0x7+parseInt(_0x1cc688(0x1ad))/0x8+parseInt(_0x1cc688(0x1ae))/0x9+-parseInt(_0x1cc688(0x1b2))/0xa;if(_0x2cfe83===_0x1f4a98)break;else _0x172945['push'](_0x172945['shift']());}catch(_0x3039c1){_0x172945['push'](_0x172945['shift']());}}}(_0x54fe,0x73870));return await this[_0x50459c(0x1af)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x1},MessageType[_0x50459c(0x1b4)],{'quoted':quoted,...options});
}

//- SEND BUTTON 2
async send2Btn(jid, content, footer, button1, row1, button2, row2, quoted, options = {}) {
function _0x5db4(_0xfda568,_0x5a6e07){var _0xd02d85=_0xd02d();return _0x5db4=function(_0x5db418,_0x1591b0){_0x5db418=_0x5db418-0x1a6;var _0x30258b=_0xd02d85[_0x5db418];return _0x30258b;},_0x5db4(_0xfda568,_0x5a6e07);}var _0x14c3b8=_0x5db4;(function(_0x3c390f,_0x252ca8){var _0x2b7292=_0x5db4,_0x4b1bdf=_0x3c390f();while(!![]){try{var _0xf0bc04=parseInt(_0x2b7292(0x1a8))/0x1*(-parseInt(_0x2b7292(0x1a7))/0x2)+-parseInt(_0x2b7292(0x1aa))/0x3+parseInt(_0x2b7292(0x1ae))/0x4+parseInt(_0x2b7292(0x1ad))/0x5+parseInt(_0x2b7292(0x1a9))/0x6+-parseInt(_0x2b7292(0x1ac))/0x7+parseInt(_0x2b7292(0x1a6))/0x8;if(_0xf0bc04===_0x252ca8)break;else _0x4b1bdf['push'](_0x4b1bdf['shift']());}catch(_0x3d8804){_0x4b1bdf['push'](_0x4b1bdf['shift']());}}}(_0xd02d,0x45610));return await this[_0x14c3b8(0x1ab)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1}],'headerType':0x1},MessageType['buttonsMessage'],{'quoted':quoted,...options});function _0xd02d(){var _0x3adb2d=['1722260cfFxGj','100248caMCKP','6424744TlpUnc','10042fgePom','95rThwxZ','593592yvUrIS','813672rJbKSK','sendMessage','1674008nCyedm'];_0xd02d=function(){return _0x3adb2d;};return _0xd02d();}
}

//- SEND BUTTON 3
async send3Btn(jid, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
function _0x13f7(){var _0x32c61c=['4410560AXTgpR','786954tQElJG','25734rGdiUX','847340HGuHnw','238FgSHwq','sendMessage','437ElJVZO','3170760MdAbdF','9fPKKek','641525pAryXP','buttonsMessage','422maxdTp'];_0x13f7=function(){return _0x32c61c;};return _0x13f7();}function _0xd656(_0x360600,_0x296611){var _0x13f7de=_0x13f7();return _0xd656=function(_0xd6562,_0x2dad19){_0xd6562=_0xd6562-0xcf;var _0x27ad0c=_0x13f7de[_0xd6562];return _0x27ad0c;},_0xd656(_0x360600,_0x296611);}var _0x5a024b=_0xd656;(function(_0x461f17,_0x1cc91a){var _0x41d561=_0xd656,_0x3da027=_0x461f17();while(!![]){try{var _0x12ec95=-parseInt(_0x41d561(0xd7))/0x1*(parseInt(_0x41d561(0xd0))/0x2)+-parseInt(_0x41d561(0xd2))/0x3+-parseInt(_0x41d561(0xd4))/0x4+-parseInt(_0x41d561(0xda))/0x5+-parseInt(_0x41d561(0xd3))/0x6*(-parseInt(_0x41d561(0xd5))/0x7)+parseInt(_0x41d561(0xd1))/0x8+-parseInt(_0x41d561(0xd9))/0x9*(-parseInt(_0x41d561(0xd8))/0xa);if(_0x12ec95===_0x1cc91a)break;else _0x3da027['push'](_0x3da027['shift']());}catch(_0xfc4099){_0x3da027['push'](_0x3da027['shift']());}}}(_0x13f7,0x4e045));return await this[_0x5a024b(0xd6)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x1},MessageType[_0x5a024b(0xcf)],{'quoted':quoted,...options});
}
	
/*
|------------------------------------------------|
| SEND BUTTON IMAGE                                  |
| Id, Img, Content, Footer, Button, Command  |
| Quoted, Option                                            |
|------------------------------------------------|
*/	

//- SEND BUTTON IMG 1
async sendBtnImg(jid, buffer, content, footer, button1, row1, quoted, options = {}) {
function _0x57f3(_0xdacae7,_0x3ca9bb){var _0x41a9c6=_0x41a9();return _0x57f3=function(_0x57f39a,_0x26d34e){_0x57f39a=_0x57f39a-0x157;var _0xe42ee5=_0x41a9c6[_0x57f39a];return _0xe42ee5;},_0x57f3(_0xdacae7,_0x3ca9bb);}var _0x449e7a=_0x57f3;(function(_0x5dbd96,_0x3fcba3){var _0x5be25e=_0x57f3,_0x3bbdb0=_0x5dbd96();while(!![]){try{var _0x28361d=-parseInt(_0x5be25e(0x15f))/0x1*(-parseInt(_0x5be25e(0x163))/0x2)+-parseInt(_0x5be25e(0x159))/0x3*(parseInt(_0x5be25e(0x160))/0x4)+parseInt(_0x5be25e(0x162))/0x5+-parseInt(_0x5be25e(0x157))/0x6+parseInt(_0x5be25e(0x161))/0x7+-parseInt(_0x5be25e(0x15c))/0x8*(parseInt(_0x5be25e(0x15a))/0x9)+parseInt(_0x5be25e(0x158))/0xa;if(_0x28361d===_0x3fcba3)break;else _0x3bbdb0['push'](_0x3bbdb0['shift']());}catch(_0x302a33){_0x3bbdb0['push'](_0x3bbdb0['shift']());}}}(_0x41a9,0xe8234));return await this[_0x449e7a(0x15e)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x4,'imageMessage':(await this[_0x449e7a(0x15b)](buffer,MessageType['image'],{}))['imageMessage']},MessageType[_0x449e7a(0x15d)],{'quoted':quoted,...options});function _0x41a9(){var _0x1b45e7=['16918770CtPSwY','243NpHLpG','18nNCPKl','prepareMessageMedia','4071448IGxtbc','buttonsMessage','sendMessage','69ZmOCWY','69772pHZMjh','13067061BUfwCH','5403635iKgezc','8698HoyVer','9346962stiUWg'];_0x41a9=function(){return _0x1b45e7;};return _0x41a9();}
}

//- SEND BUTTON IMG 2
async send2BtnImg(jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}) {
var _0x29aa07=_0x2c24;function _0x2c24(_0x1f67d9,_0x3e88e3){var _0x4295ac=_0x4295();return _0x2c24=function(_0x2c2404,_0x52cd8a){_0x2c2404=_0x2c2404-0xb4;var _0x27b693=_0x4295ac[_0x2c2404];return _0x27b693;},_0x2c24(_0x1f67d9,_0x3e88e3);}function _0x4295(){var _0x168cf5=['4oyJDYz','866958UjKxPe','5495576SUeFef','buttonsMessage','9jzJUsW','752375RKAeXH','898529chBPfj','2639056PYlcPE','sendMessage','10608936bnbLzr','1993551DRpIzT','image'];_0x4295=function(){return _0x168cf5;};return _0x4295();}(function(_0x3d281e,_0x3b5ee0){var _0x1e5a48=_0x2c24,_0x35bf7e=_0x3d281e();while(!![]){try{var _0x574f61=-parseInt(_0x1e5a48(0xbf))/0x1+-parseInt(_0x1e5a48(0xb4))/0x2+parseInt(_0x1e5a48(0xba))/0x3+parseInt(_0x1e5a48(0xb9))/0x4*(parseInt(_0x1e5a48(0xbe))/0x5)+parseInt(_0x1e5a48(0xb6))/0x6+parseInt(_0x1e5a48(0xb7))/0x7+parseInt(_0x1e5a48(0xbb))/0x8*(parseInt(_0x1e5a48(0xbd))/0x9);if(_0x574f61===_0x3b5ee0)break;else _0x35bf7e['push'](_0x35bf7e['shift']());}catch(_0x5e3db7){_0x35bf7e['push'](_0x35bf7e['shift']());}}}(_0x4295,0xeab14));return await this[_0x29aa07(0xb5)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1}],'headerType':0x4,'imageMessage':(await this['prepareMessageMedia'](buffer,MessageType[_0x29aa07(0xb8)],{}))['imageMessage']},MessageType[_0x29aa07(0xbc)],{'quoted':quoted,...options});
}

//- SEND BUTTON IMG 3
async send3BtnImg(jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
function _0x21d6(){var _0x5837da=['456394HHUZeg','1160096slUhRr','349252GPXdKp','4690aCofXd','1285200hvCiCC','14bUGuwT','9aJRWIh','7701190McMTFw','buttonsMessage','396225iYimMV','imageMessage','image','sendMessage','964egPPXO'];_0x21d6=function(){return _0x5837da;};return _0x21d6();}function _0x53e3(_0x495992,_0x3f9bce){var _0x21d664=_0x21d6();return _0x53e3=function(_0x53e3d2,_0x4a4945){_0x53e3d2=_0x53e3d2-0x159;var _0x5b5f88=_0x21d664[_0x53e3d2];return _0x5b5f88;},_0x53e3(_0x495992,_0x3f9bce);}var _0x57ed34=_0x53e3;(function(_0x4f4a57,_0x3cf6bb){var _0xa0ec10=_0x53e3,_0x3aff0d=_0x4f4a57();while(!![]){try{var _0x59c903=-parseInt(_0xa0ec10(0x15e))/0x1+parseInt(_0xa0ec10(0x160))/0x2+parseInt(_0xa0ec10(0x159))/0x3+-parseInt(_0xa0ec10(0x15d))/0x4*(parseInt(_0xa0ec10(0x161))/0x5)+parseInt(_0xa0ec10(0x162))/0x6+-parseInt(_0xa0ec10(0x163))/0x7*(parseInt(_0xa0ec10(0x15f))/0x8)+parseInt(_0xa0ec10(0x164))/0x9*(parseInt(_0xa0ec10(0x165))/0xa);if(_0x59c903===_0x3cf6bb)break;else _0x3aff0d['push'](_0x3aff0d['shift']());}catch(_0x4dd2ec){_0x3aff0d['push'](_0x3aff0d['shift']());}}}(_0x21d6,0x4dc50));return await this[_0x57ed34(0x15c)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x4,'imageMessage':(await this['prepareMessageMedia'](buffer,MessageType[_0x57ed34(0x15b)],{}))[_0x57ed34(0x15a)]},MessageType[_0x57ed34(0x166)],{'quoted':quoted,...options});
}

/*
|------------------------------------------------|
| SEND BUTTON VIDEO                                  |
| Id, Vid, Content, Footer, Button, Command   |
| Quoted, Option                                            |
|------------------------------------------------|
*/	

//- SEND BUTTON VID 1
async sendBtnVid(jid, buffer, content, footer, button1, row1, quoted, options = {}){
var _0x4be19a=_0x5d86;function _0x5d86(_0x50211e,_0x1832fa){var _0x5e81d8=_0x5e81();return _0x5d86=function(_0x5d8696,_0x143820){_0x5d8696=_0x5d8696-0x78;var _0x22891f=_0x5e81d8[_0x5d8696];return _0x22891f;},_0x5d86(_0x50211e,_0x1832fa);}(function(_0x29da30,_0x3ea881){var _0x503edf=_0x5d86,_0x38a378=_0x29da30();while(!![]){try{var _0x5d7249=-parseInt(_0x503edf(0x79))/0x1+-parseInt(_0x503edf(0x81))/0x2*(-parseInt(_0x503edf(0x84))/0x3)+parseInt(_0x503edf(0x7a))/0x4*(-parseInt(_0x503edf(0x7d))/0x5)+parseInt(_0x503edf(0x83))/0x6+parseInt(_0x503edf(0x82))/0x7*(parseInt(_0x503edf(0x80))/0x8)+parseInt(_0x503edf(0x7f))/0x9*(parseInt(_0x503edf(0x85))/0xa)+-parseInt(_0x503edf(0x7c))/0xb*(parseInt(_0x503edf(0x7b))/0xc);if(_0x5d7249===_0x3ea881)break;else _0x38a378['push'](_0x38a378['shift']());}catch(_0x453201){_0x38a378['push'](_0x38a378['shift']());}}}(_0x5e81,0xec809));return await this['sendMessage'](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x5,'videoMessage':(await this['prepareMessageMedia'](buffer,MessageType[_0x4be19a(0x78)],{}))['videoMessage']},MessageType[_0x4be19a(0x7e)],{'quoted':quoted,...options});function _0x5e81(){var _0x4d2930=['117AVnQFw','10512kpuUDF','8NrtJDI','4529sQgXnE','10019454hQBfsA','948351jmNsgt','370240xhZNwi','video','1918818TYncWO','88708XAkCwu','279492EOmkln','33FdOuCB','295SWTrXY','buttonsMessage'];_0x5e81=function(){return _0x4d2930;};return _0x5e81();}
}

//- SEND BUTTON VID 2
async send2BtnVid(jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}){
var _0x391214=_0x21c8;(function(_0xbefd23,_0x4a594a){var _0x5e6f72=_0x21c8,_0x5aa40b=_0xbefd23();while(!![]){try{var _0x546bb7=-parseInt(_0x5e6f72(0x1c9))/0x1*(-parseInt(_0x5e6f72(0x1cb))/0x2)+parseInt(_0x5e6f72(0x1d0))/0x3+parseInt(_0x5e6f72(0x1cf))/0x4+-parseInt(_0x5e6f72(0x1ca))/0x5+parseInt(_0x5e6f72(0x1d1))/0x6+parseInt(_0x5e6f72(0x1c7))/0x7*(-parseInt(_0x5e6f72(0x1cd))/0x8)+parseInt(_0x5e6f72(0x1d2))/0x9;if(_0x546bb7===_0x4a594a)break;else _0x5aa40b['push'](_0x5aa40b['shift']());}catch(_0x3fe6c9){_0x5aa40b['push'](_0x5aa40b['shift']());}}}(_0x53a4,0xc8aa6));function _0x53a4(){var _0xe1fa92=['sendMessage','3678808wbKznE','video','2863136qeVqrd','4911699otysdh','4588530ohdJNE','4289256rXktsN','21doglhR','videoMessage','55813xNKVNZ','7243450aVilJj','2hCSomh'];_0x53a4=function(){return _0xe1fa92;};return _0x53a4();}function _0x21c8(_0x1263ac,_0x3a6a76){var _0x53a4c6=_0x53a4();return _0x21c8=function(_0x21c87b,_0x567cca){_0x21c87b=_0x21c87b-0x1c7;var _0x30e2ad=_0x53a4c6[_0x21c87b];return _0x30e2ad;},_0x21c8(_0x1263ac,_0x3a6a76);}return await this[_0x391214(0x1cc)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1}],'headerType':0x5,'videoMessage':(await this['prepareMessageMedia'](buffer,MessageType[_0x391214(0x1ce)],{}))[_0x391214(0x1c8)]},MessageType['buttonsMessage'],{'quoted':quoted,...options});
}

//- SEND 3 BUTTON VID
async send3BtnVid(jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}){
function _0x53e0(_0x2e28a1,_0x525745){var _0x44f63b=_0x44f6();return _0x53e0=function(_0x53e0ef,_0x3bde32){_0x53e0ef=_0x53e0ef-0x189;var _0x2fc436=_0x44f63b[_0x53e0ef];return _0x2fc436;},_0x53e0(_0x2e28a1,_0x525745);}var _0x22cc04=_0x53e0;(function(_0x5aee28,_0x485b6f){var _0x56a081=_0x53e0,_0x14480c=_0x5aee28();while(!![]){try{var _0x2d845e=-parseInt(_0x56a081(0x18a))/0x1+-parseInt(_0x56a081(0x18e))/0x2+parseInt(_0x56a081(0x18f))/0x3+parseInt(_0x56a081(0x194))/0x4+parseInt(_0x56a081(0x189))/0x5+parseInt(_0x56a081(0x18b))/0x6*(parseInt(_0x56a081(0x192))/0x7)+-parseInt(_0x56a081(0x190))/0x8;if(_0x2d845e===_0x485b6f)break;else _0x14480c['push'](_0x14480c['shift']());}catch(_0x504607){_0x14480c['push'](_0x14480c['shift']());}}}(_0x44f6,0x31c16));return await this[_0x22cc04(0x193)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x5,'videoMessage':(await this[_0x22cc04(0x195)](buffer,MessageType[_0x22cc04(0x18c)],{}))[_0x22cc04(0x191)]},MessageType[_0x22cc04(0x18d)],{'quoted':quoted,...options});function _0x44f6(){var _0x392686=['787002exrBtj','2499936zJzKIR','videoMessage','31885FYGSHG','sendMessage','1028104nqeGxm','prepareMessageMedia','1504135Hyzisx','302421FupgGr','300jxKOni','video','buttonsMessage','458452TBijuq'];_0x44f6=function(){return _0x392686;};return _0x44f6();}
}


/*
|------------------------------------------------|
| SEND BUTTON LOCATION                            |
| Id, Img, Content, Footer, Button, Command  |
| Quoted, Option                                            |
|------------------------------------------------|
*/	

//- SEND BUTTON LOC 1
async sendLoc(jid, buffer, content, footer, button1, row1, quoted, options = {}) {
      return await this.sendMessage(jid, {
        locationMessage: { jpegThumbnail: buffer },
        contentText: content,
        footerText: footer,
        buttons: [{ buttonId: row1, buttonText: { displayText: button1 }, type: 1 }],
        headerType: 6
      }, MessageType.buttonsMessage, { quoted, ...options 
	  })
}

//- SEND BUTTON LOC 2
async send2Loc(jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}) {
      return await this.sendMessage(jid, {
        locationMessage: { jpegThumbnail: buffer },
        contentText: content,
        footerText: footer,
        buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
          { buttonId: row2, buttonText: { displayText: button2 }, type: 1 }
        ],
        headerType: 6
      }, MessageType.buttonsMessage, { quoted, ...options 
	  })
}
    
//- SEND BUTTON LOC 3
async send3Loc(jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
      return await this.sendMessage(jid, {
        locationMessage: { jpegThumbnail: buffer },
        contentText: content,
        footerText: footer,
        buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
          { buttonId: row2, buttonText: { displayText: button2 }, type: 1 },
          { buttonId: row3, buttonText: { displayText: button3 }, type: 1 }
        ],
        headerType: 6
      }, MessageType.buttonsMessage, { quoted, ...options })
}

/*
|------------------------------------------------|
| SEND BUTTON VIDEO                                  |
| Id, Vid, Content, Footer, Button, Command   |
| Quoted, Option                                            |
|------------------------------------------------|
*/	

//- SEND BUTTON VID 1
async sendBtnDoc(jid, buffer, content, footer, button1, row1, quoted, options = {}){
return await this.sendMessage(jid, {
        contentText: content,
        footerText: footer,
buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 }
        ],
        headerType: 3,
        documentMessage: (await this.prepareMessageMedia(buffer, MessageType.document, {})).documentMessage
      }, MessageType.buttonsMessage, {
        quoted, ...options
      })
}	
	
	
    /**
     * Send Contact
     * @param {String} jid
     * @param {String|Number} number
     * @param {String} name
     * @param {Object} quoted
     * @param {Object} options
     */
    async sendContact(jid, number, name, quoted, options) {
      // TODO: Business Vcard
      number = number.replace(/[^0-9]/g, '')
      let njid = number + '@s.whatsapp.net'
      let { isBusiness } = await this.isOnWhatsApp(njid) || { isBusiness: false }
      let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${isBusiness ? `
X-WA-BIZ-NAME:${(this.contacts[njid].vname || this.getName(njid)).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${((await this.getBusinessProfile(njid)).description || '').replace(/\n/g, '\\n')}
` : ''}
END:VCARD
`.trim()
      return await this.sendMessage(jid, {
        displayName: name,
        vcard
      }, MessageType.contact, { quoted, ...options })
    }

    /**
    * sendGroupV4Invite
    * @param {String} jid 
    * @param {*} participant 
    * @param {String} inviteCode 
    * @param {Number} inviteExpiration 
    * @param {String} groupName 
    * @param {String} caption 
    * @param {*} options 
    * @returns 
    */
    async sendGroupV4Invite(jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', options = {}) {
      let msg = WAMessageProto.Message.fromObject({
        groupInviteMessage: WAMessageProto.GroupInviteMessage.fromObject({
          inviteCode,
          inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
          groupJid: jid,
          groupName: groupName ? groupName : this.getName(jid),
          caption
        })
      })
      let message = await this.prepareMessageFromContent(participant, msg, options)
      await this.relayWAMessage(message)
      return message
    }

    /**
 * fetchRequest
 * @param {*} endpoint 
 * @param {String} method ('GET'|'POST')
 * @param {*} body 
 * @param {*} agent 
 * @param {*} headers 
 * @param {*} redirect 
 * @returns 
 */
    fetchRequest = async (
      endpoint,
      method = 'GET',
      body,
      agent,
      headers,
      redirect = 'follow'
    ) => {
      try {
        let res = await fetch(endpoint, {
          method,
          body,
          redirect,
          headers: { Origin: DEFAULT_ORIGIN, ...(headers || {}) },
          agent: agent || this.connectOptions.fetchAgent
        })
        return await res.json()
      } catch (e) {
        console.error(e)
        let res = await got(endpoint, {
          method,
          body,
          followRedirect: redirect == 'follow' ? true : false,
          headers: { Origin: DEFAULT_ORIGIN, ...(headers || {}) },
          agent: { https: agent || this.connectOptions.fetchAgent }
        })
        return JSON.parse(res.body)
      }
    }

    /**
     * prepareMessageMedia
     * @param {Buffer} buffer 
     * @param {*} mediaType 
     * @param {*} options 
     * @returns 
     */
    /** Prepare a media message for sending */
    async prepareMessageMedia(buffer, mediaType, options = {}) {
      await this.waitForConnection()

      if (mediaType === MessageType.document && !options.mimetype) {
        throw new Error('mimetype required to send a document')
      }
      if (mediaType === MessageType.sticker && options.caption) {
        throw new Error('cannot send a caption with a sticker')
      }
      if (!(mediaType === MessageType.image || mediaType === MessageType.video) && options.viewOnce) {
        throw new Error(`cannot send a ${mediaType} as a viewOnceMessage`)
      }
      if (!options.mimetype) {
        options.mimetype = MimetypeMap[mediaType]
      }
      let isGIF = false
      if (options.mimetype === Mimetype.gif) {
        isGIF = true
        options.mimetype = MimetypeMap[MessageType.video]
      }
      const requiresThumbnailComputation = (mediaType === MessageType.image || mediaType === MessageType.video) && !('thumbnail' in options)
      const requiresDurationComputation = mediaType === MessageType.audio && !options.duration
      const requiresOriginalForSomeProcessing = requiresDurationComputation || requiresThumbnailComputation

      const mediaKey = randomBytes(32)
      const mediaKeys = getMediaKeys(mediaKey, mediaType)
      const enc = aesEncrypWithIV(buffer, mediaKeys.cipherKey, mediaKeys.iv)
      const mac = hmacSign(Buffer.concat([mediaKeys.iv, enc]), mediaKeys.macKey).slice(0, 10)
      const body = Buffer.concat([enc, mac]) // body is enc + mac
      const fileSha256 = sha256(buffer)
      const fileEncSha256 = sha256(body)
      const {
        encBodyPath,
        bodyPath,
        fileLength,
        didSaveToTmpPath
      } = await encryptedStream(buffer, mediaType, requiresOriginalForSomeProcessing)
      // url safe Base64 encode the SHA256 hash of the body
      const fileEncSha256B64 = encodeURIComponent(
        fileEncSha256
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/\=+$/, '')
      )
      if (requiresThumbnailComputation) await generateThumbnail(bodyPath, mediaType, options)
      if (requiresDurationComputation) {
        try {
          options.duration = await getAudioDuration(bodyPath)
        } catch (error) {
          this.logger.debug({ error }, 'failed to obtain audio duration: ' + error.message)
        }
      }

      // send a query JSON to obtain the url & auth token to upload our media
      let json = await this.refreshMediaConn(options.forceNewMediaOptions)

      let mediaUrl = ''
      for (let host of json.hosts) {
        const auth = encodeURIComponent(json.auth) // the auth token
        const url = `https://${host.hostname}${MediaPathMap[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`

        try {
          const result = await this.fetchRequest(url, 'POST', body, options.uploadAgent, { 'Content-Type': 'application/octet-stream' })
          mediaUrl = result && result.url ? result.url : undefined

          if (mediaUrl) break
          else {
            json = await this.refreshMediaConn(true)
            throw new Error(`upload failed, reason: ${JSON.stringify(result)}`)
          }
        } catch (error) {
          const isLast = host.hostname === json.hosts[json.hosts.length - 1].hostname
          this.logger.error(`Error in uploading to ${host.hostname}${isLast ? '' : ', retrying...'}`)
        }
      }
      if (!mediaUrl) throw new Error('Media upload failed on all hosts')

      await Promise.all(
        [
          fs.promises.unlink(encBodyPath),
          didSaveToTmpPath && bodyPath && fs.promises.unlink(bodyPath)
        ]
          .filter(f => typeof f == 'boolean')
      )

      const message = {
        [mediaType]: MessageTypeProto[mediaType].fromObject(
          {
            url: mediaUrl,
            mediaKey: mediaKey,
            mimetype: options.mimetype,
            fileEncSha256: fileEncSha256,
            fileSha256: fileSha256,
            fileLength: fileLength,
            seconds: options.duration,
            fileName: options.filename || 'file',
            gifPlayback: isGIF || undefined,
            caption: options.caption,
            ptt: options.ptt,
            viewOnce: options.viewOnce
          }
        )
      }
      return WAMessageProto.Message.fromObject(message) // as WAMessageContent
    }

    /**
     * getBuffer hehe
     * @param {String|Buffer} path
     */
    async getFile(path) {
      let res
      let data = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (res = await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : typeof path === 'string' ? path : Buffer.alloc(0)
      if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
      let type = await FileType.fromBuffer(data) || {
        mime: 'application/octet-stream',
        ext: '.bin'
      }

      return {
        res,
        ...type,
        data
      }
    }

    /**
    * Send Video Faster
    * @param {String} jid 
    * @param {String|Buffer} url 
    * @param {String} caption 
    * @param {Object} quoted 
    * @param {Object} options 
    */
    async sendVideo(jid, url, caption, quoted, opt) {
      await download(url, 'mp4', async ({ buffer, filename }) => {
        let video
        if (fs.existsSync(filename)) {
          video = await (await this.getFile(filename)).data
          if (!Buffer.isBuffer(video)) video = await fs.readFileSync(filename)
        }
        else if (Buffer.isBuffer(buffer)) video = await buffer
        if (!Buffer.isBuffer(video)) throw new TypeError('Result is not a buffer')
        // buffer = await toVideo(buffer, 'mp4')
        return await this.sendMessage(jid, video, MessageType.video, { caption: caption, quoted, ...opt })
      })
    }

    /**
     * Send Buttons
     * @param {String} jid
     * @param {String} content
     * @param {String} footer
     * @param {String} button1
     * @param {String} row1
     * @param {Object} quoted
     * @param {Object} options
     */
   

    /**
     * Send Button with Image
     * @param {String} jid
     * @param {Buffer} buffer
     * @param {String} content
     * @param {String} footer
     * @param {String} button1
     * @param {String} row1
     * @param {String} button2
     * @param {String} row2
     * @param {String} button3
     * @param {String} row3
     * @param {Object} quoted
     * @param {Object} options
     */
    

    /**
         * Send Buttons with Location
         * @param {String} jid
         * @param {Buffer} buffer
         * @param {String} content
         * @param {String} footer
         * @param {String} button1
         * @param {String} row1
         * @param {String} button2
         * @param {String} row2
         * @param {String} button3
         * @param {String} row3
         * @param {Object} quoted
         * @param {Object} options
         */
    

    /**
     * Send Media/File with Automatic Type Specifier
     * @param {String} jid
     * @param {String|Buffer} path
     * @param {String} filename
     * @param {String} caption
     * @param {Object} quoted
     * @param {Boolean} ptt
     * @param {Object} options
     */
    async sendFile(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
      let type = await this.getFile(path)
      let { res, data: file } = type
      if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
      }
      let opt = { filename, caption }
      if (quoted) opt.quoted = quoted
      if (!type) if (options.asDocument) options.asDocument = true
      let mtype = ''
      if (options.asSticker) mtype = MessageType.sticker
      else if (!options.asDocument && !options.type) {
        if (options.force) file = file
        else if (/audio/.test(type.mime)) file = await (ptt ? toPTT : toAudio)(file, type.ext)
        // else if (/video/.test(type.mime)) file = await toVideo(file, type.ext)
        if (/webp/.test(type.mime) && file.length <= 1 << 20) mtype = MessageType.sticker
        else if (/image/.test(type.mime)) mtype = MessageType.image
        else if (/video/.test(type.mime)) {
          try { return await this.sendVideo(jid, file, caption, quoted, { ...opt, ...options }) }
          catch (e) {
            console.error('Error send video using sendVideo, retrying using sendMessage... ', e)
            file = await toVideo(file, type.ext)
            mtype = MessageType.video
          }
        }
        else opt.displayName = opt.caption = filename
        if (options.asGIF && mtype === MessageType.video) mtype = MessageType.gif
        if (/audio/.test(type.mime)) {
          mtype = MessageType.audio
          if (!ptt) opt.mimetype = 'audio/mp4'
          opt.ptt = ptt
        } else if (/pdf/.test(type.ext)) mtype = MessageType.pdf
        else if (!mtype) {
          mtype = MessageType.document
          opt.mimetype = type.mime
        }
      } else {
        mtype = options.type ? options.type : MessageType.document
        opt.mimetype = type.mime
      }
      delete options.asDocument
      delete options.asGIF
      delete options.asSticker
      delete options.type
      if (mtype === MessageType.document) opt.title = filename
      if (mtype === MessageType.sticker || !opt.caption) delete opt.caption
      return await this.sendMessage(jid, file, mtype, { ...opt, ...options })
    }

    /**
     * Reply to a message
     * @param {String} jid
     * @param {String|Object} text
     * @param {Object} quoted
     * @param {Object} options
     */
    reply(jid, text, quoted, options) {
      return Buffer.isBuffer(text) ? this.sendFile(jid, text, 'file', '', quoted, false, options) : this.sendMessage(jid, text, MessageType.extendedText, { contextInfo: { mentionedJid: this.parseMention(text) }, quoted, ...options })
    }

    /**
     * Fake Replies
     * @param {String} jid
     * @param {String|Object} text
     * @param {String} fakeJid
     * @param {String} fakeText
     * @param {String} fakeGroupJid
     * @param {String} options
     */
    fakeReply(jid, text = '', fakeJid = this.user.jid, fakeText = '', fakeGroupJid, options) {
      return this.reply(jid, text, { key: { fromMe: fakeJid == this.user.jid, participant: fakeJid, ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}) }, message: { conversation: fakeText }, ...options })
    }

    /**
     * Fake replies #2
     * @param {String} jid
     * @param {String|Object} message
     * @param {String} type
     * @param {String} sender
     * @param {String|Object} message2
     * @param {String} type2
     * @param {Object} options
     * @param {Object} options2
     * @param {String} remoteJid
     */
    async fakeReply2(jid, message, type, sender, message2, type2, options = {}, options2 = {}, remoteJid) {
      let quoted = await this.prepareMessage(jid, message2, type2, options2)
      quoted = this.cMod(jid, quoted, undefined, sender)
      if (remoteJid) quoted.key.remoteJid = remoteJid
      else delete quoted.key.remoteJid

      return await this.prepareMessage(jid, message, type, { quoted, ...options })
    }

    /**
     * Parses string into mentionedJid(s)
     * @param {String} text
     */
    parseMention(text = '') {
      return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }

    /**
     * Get name from jid
     * @param {String} jid
     * @param {Boolean} withoutContact
     */
    getName(jid, withoutContact = false) {
      withoutContact = this.withoutContact || withoutContact
      let chat
      let v = jid.endsWith('@g.us') ? (chat = this.chats.get(jid) || {}) && chat.metadata || {} : jid === '0@s.whatsapp.net' ? {
        jid,
        vname: 'WhatsApp'
      } : jid === this.user.jid ?
        this.user :
        this.contactAddOrGet(jid)
      return (withoutContact ? '' : v.name) || v.subject || v.vname || v.notify || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    /**
     * Download media message
     * @param {Object} m
     */
    async downloadM(m) {
      if (!m) return Buffer.alloc(0)
      if (!m.message) m.message = { m }
      if (!m.message[Object.keys(m.message)[0]].url) await this.updateMediaMessage(m)
      return await this.downloadMediaMessage(m)
    }

    /**
     * Serialize Message, so it easier to manipulate
     * @param {Object} m
     */
    serializeM(m) {
      return exports.smsg(this, m)
    }
  }

  return WAConnection
}

/**
 * Serialize Message
 * @param {WAConnection} conn
 * @param {Object} m
 * @param {Boolean} hasParent
 */
exports.smsg = (conn, m, hasParent) => {
  if (!m) return m
  let M = WAMessageProto.WebMessageInfo
  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id.startsWith('3EB0') && m.id.length === 12
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = m.fromMe ? conn.user.jid : m.participant ? m.participant : m.key.participant ? m.key.participant : m.chat
  }
  if (m.message) {
    m.mtype = Object.keys(m.message)[0]
    m.msg = m.message[m.mtype]
    if (m.mtype === 'ephemeralMessage') {
      exports.smsg(conn, m.msg)
      m.mtype = m.msg.mtype
      m.msg = m.msg.msg
    }
    let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
    if (m.quoted) {
      let type = Object.keys(m.quoted)[0]
      m.quoted = m.quoted[type]
      if (['productMessage'].includes(type)) {
        type = Object.keys(m.quoted)[0]
        m.quoted = m.quoted[type]
      }
      if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
      m.quoted.mtype = type
      m.quoted.id = m.msg.contextInfo.stanzaId
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('3EB0') && m.quoted.id.length === 12 : false
      m.quoted.sender = m.msg.contextInfo.participant
      m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.jid)
      m.quoted.text = m.quoted.text || m.quoted.caption || ''
      m.quoted.mentionedJid = m.quoted.contextInfo ? m.quoted.contextInfo.mentionedJid : []
      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false
        let q = await conn.loadMessage(m.chat, m.quoted.id)
        return exports.smsg(conn, q)
      }
      let vM = m.quoted.fakeObj = M.fromObject({
        key: {
          fromMe: m.quoted.fromMe,
          remoteJid: m.quoted.chat,
          id: m.quoted.id
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
      })
      if (m.quoted.url) m.quoted.download = (type = 'buffer') => conn.downloadM(vM, type)
      /**
       * Reply to quoted message
       * @param {String|Object} text
       * @param {String|false} chatId
       * @param {Object} options
       */
      m.quoted.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, vM, options)
      /**
       * Copy quoted message
       */
      m.quoted.copy = () => exports.smsg(conn, M.fromObject(M.toObject(vM)))
      /**
       * Forward quoted message
       * @param {String} jid
       * @param {Boolean} forceForward
       */
      m.quoted.forward = (jid, forceForward = false) => conn.forwardMessage(jid, vM, forceForward)
      /**
       * Exact Forward quoted message
       * @param {String} jid
       * @param {Boolean} forceForward
       * @param {Object} options
       */
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options)
      /**
       * Modify quoted Message
       * @param {String} jid
       * @param {String} text
       * @param {String} sender
       * @param {Object} options
       */
      m.quoted.cMod = (jid, text = '', sender = m.quoted.sender, options = {}) => conn.cMod(jid, vM, text, sender, options)
      /**
       * Delete quoted message
       */
      m.quoted.delete = () => conn.deleteMessage(m.quoted.chat, vM.key)
    }
    if (m.msg.url) m.download = (type = 'buffer') => conn.downloadM(m, type)
    m.text = (m.mtype == 'listResponseMessage' ? m.msg.singleSelectReply.selectedRowId : '') || m.msg.text || m.msg.caption || m.msg || ''
    /**
     * Reply to this message
     * @param {String|Object} text
     * @param {String|false} chatId
     * @param {Object} options
     */
    m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options)
    /**
     * Copy this message
     */
    m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))
    /**
     * Forward this message
     * @param {String} jid
     * @param {Boolean} forceForward
     */
    m.forward = (jid = m.chat, forceForward = false) => conn.forwardMessage(jid, m, forceForward)
    /**
     * Exact Forward this message
     * @param {String} jid
     * @param {Boolean} forceForward
     * @param {Object} options
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
    /**
     * Modify this Message
     * @param {String} jid
     * @param {String} text
     * @param {String} sender
     * @param {Object} options
     */
    m.cMod = (jid, text = '', sender = m.sender, options = {}) => conn.cMod(jid, m, text, sender, options)
  }
  return m
}

exports.logic = (check, inp, out) => {
  if (inp.length !== out.length) throw new Error('Input and Output must have same length')
  for (let i in inp) if (util.isDeepStrictEqual(check, inp[i])) return out[i]
  return null
}

/**
 * generateThumbnail
 * @param {String} file 
 * @param {*} mediaType 
 * @param {*} info 
 */
async function generateThumbnail(file, mediaType, info) {
  const alternate = (Buffer.alloc(1)).toString('base64')
  if ('thumbnail' in info) {
    // don't do anything if the thumbnail is already provided, or is null
    if (mediaType === MessageType.audio) {
      throw new Error('audio messages cannot have thumbnails')
    }
  } else if (mediaType === MessageType.image) {
    try {
      const buff = await compressImage(file)
      info.thumbnail = buff.toString('base64')
    } catch (err) {
      console.error(err)
      info.thumbnail = alternate
    }
  } else if (mediaType === MessageType.video) {
    const imgFilename = path.join(tmpdir(), generateMessageID() + '.jpg')
    try {
      try {
        await extractVideoThumb(file, imgFilename, '00:00:00', { width: 48, height: 48 })
        const buff = await fs.promises.readFile(imgFilename)
        info.thumbnail = buff.toString('base64')
        await fs.promises.unlink(imgFilename)
      } catch (e) {
        console.error(e)
        info.thumbnail = alternate
      }
    } catch (err) {
      console.log('could not generate video thumb: ' + err)
    }
  }
}

/**
 * 
 * @param {String} path 
 * @param {*} destPath 
 * @param {String} time ('00:00:00')
 * @param {{width: Number, height: Number}} size 
 * @returns 
 */
const extractVideoThumb = async (
  path,
  destPath,
  time,
  size = {},
) =>
  new Promise((resolve, reject) => {
    const cmd = `ffmpeg -ss ${time} -i ${path} -y -s ${size.width}x${size.height} -vframes 1 -f image2 ${destPath}`
    exec(cmd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

/**
 * download video from url or buffer
 * @param {String|Buffer} media 
 * @returns Buffer
 */
async function download(media, mime, callback) {
  if (Buffer.isBuffer(media)) {
    if (typeof callback == 'function') await callback({ buffer: media, filename: '' })
    return media
  }
  let filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + mime)
  let buffer
  try {
    let totalErr = 0
    await request(media).pipe(await fs.createWriteStream(filename)).on('finish', async () => {
      buffer = await fs.readFileSync(filename)
      if (typeof callback == 'function') await callback({ buffer, filename })
    })
    if (fs.existsSync(filename)) await fs.unlinkSync(filename)
    return filename
  } catch (err) {
    try {
      let res = await fetch(media)
      await res.body.pipe(await fs.createWriteStream(filename)).on('finish', async () => {
        buffer = await fs.readFileSync(filename)
        if (typeof callback == 'function') await callback({ buffer, filename })
      })
      if (fs.existsSync(filename)) await fs.unlinkSync(filename)
      return filename
    } catch (e) {
      throw e
    }
  }
  return filename
}

function delay(ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

function format(...args) {
  return util.format(...args)
}