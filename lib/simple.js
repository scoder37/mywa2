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
# FUNCTION BUTTON BY AMIRUL DEV      
###################################
*/

/*
|------------------------------------------------|
| SEND BUTTON                                    
| Id, Content, Footer, Button, Command,        
| Quoted, Option                                 
|------------------------------------------------|
*/

//- SEND BUTTON 1
async sendBtn(jid, content, footer, button1, row1, quoted, options = {}) {
var _0x21dd19=_0x539c;(function(_0x11bd4a,_0x3149f4){var _0x562b38=_0x539c,_0x2326f1=_0x11bd4a();while(!![]){try{var _0x484d47=parseInt(_0x562b38(0x94))/0x1+-parseInt(_0x562b38(0x92))/0x2+parseInt(_0x562b38(0x8f))/0x3+-parseInt(_0x562b38(0x8b))/0x4*(parseInt(_0x562b38(0x93))/0x5)+-parseInt(_0x562b38(0x8c))/0x6+parseInt(_0x562b38(0x90))/0x7*(-parseInt(_0x562b38(0x8e))/0x8)+parseInt(_0x562b38(0x91))/0x9;if(_0x484d47===_0x3149f4)break;else _0x2326f1['push'](_0x2326f1['shift']());}catch(_0x42dff8){_0x2326f1['push'](_0x2326f1['shift']());}}}(_0x1022,0xdb930));function _0x539c(_0x3a0dc5,_0x3fa042){var _0x102297=_0x1022();return _0x539c=function(_0x539ce5,_0xda5f91){_0x539ce5=_0x539ce5-0x8b;var _0xce3492=_0x102297[_0x539ce5];return _0xce3492;},_0x539c(_0x3a0dc5,_0x3fa042);}function _0x1022(){var _0x44b300=['1196PFFRSh','8149986rGfBrV','sendMessage','8KvLoMM','982833cHcahe','9924026NychLR','38339037oIagaz','2531104PuHzya','23540InNAxb','1761165MgDPjB','buttonsMessage'];_0x1022=function(){return _0x44b300;};return _0x1022();}return await this[_0x21dd19(0x8d)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x1},MessageType[_0x21dd19(0x95)],{'quoted':quoted,...options});      
}

//- SEND BUTTON 2
async send2Btn(jid, content, footer, button1, row1, button2, row2, quoted, options = {}) {
var _0x5d5c83=_0x48bb;function _0x33bd(){var _0x37fc75=['sendMessage','786726ABcvfx','14124520JRSIAD','15eAzrMQ','330552pbgpBf','461848JSyIpw','6006520nJoGdv','21mCWyuF','buttonsMessage','21563RYhClW','34blrWjc','4399766nFCWDv'];_0x33bd=function(){return _0x37fc75;};return _0x33bd();}(function(_0x33924e,_0x27a17f){var _0x1d3fc7=_0x48bb,_0x22a81f=_0x33924e();while(!![]){try{var _0x26a2d3=parseInt(_0x1d3fc7(0xd4))/0x1*(-parseInt(_0x1d3fc7(0xd5))/0x2)+parseInt(_0x1d3fc7(0xde))/0x3*(-parseInt(_0x1d3fc7(0xdc))/0x4)+parseInt(_0x1d3fc7(0xda))/0x5*(parseInt(_0x1d3fc7(0xdb))/0x6)+-parseInt(_0x1d3fc7(0xd6))/0x7+parseInt(_0x1d3fc7(0xdd))/0x8+-parseInt(_0x1d3fc7(0xd8))/0x9+parseInt(_0x1d3fc7(0xd9))/0xa;if(_0x26a2d3===_0x27a17f)break;else _0x22a81f['push'](_0x22a81f['shift']());}catch(_0x5358e3){_0x22a81f['push'](_0x22a81f['shift']());}}}(_0x33bd,0x6ae1a));function _0x48bb(_0x141c15,_0xf5b2df){var _0x33bdb0=_0x33bd();return _0x48bb=function(_0x48bb18,_0x4f4065){_0x48bb18=_0x48bb18-0xd4;var _0x29b066=_0x33bdb0[_0x48bb18];return _0x29b066;},_0x48bb(_0x141c15,_0xf5b2df);}return await this[_0x5d5c83(0xd7)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1}],'headerType':0x1},MessageType[_0x5d5c83(0xdf)],{'quoted':quoted,...options});
}

//- SEND BUTTON 3
async send3Btn(jid, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
function _0x198d(_0x4baa53,_0x2c5b96){var _0x4a360b=_0x4a36();return _0x198d=function(_0x198dca,_0x24521c){_0x198dca=_0x198dca-0x149;var _0x51973d=_0x4a360b[_0x198dca];return _0x51973d;},_0x198d(_0x4baa53,_0x2c5b96);}var _0x5ec201=_0x198d;(function(_0x45ec14,_0x542f9e){var _0x5b2a18=_0x198d,_0xfae801=_0x45ec14();while(!![]){try{var _0x1e2728=-parseInt(_0x5b2a18(0x151))/0x1*(-parseInt(_0x5b2a18(0x14f))/0x2)+-parseInt(_0x5b2a18(0x152))/0x3+parseInt(_0x5b2a18(0x14d))/0x4+parseInt(_0x5b2a18(0x14b))/0x5*(parseInt(_0x5b2a18(0x14a))/0x6)+-parseInt(_0x5b2a18(0x153))/0x7+parseInt(_0x5b2a18(0x154))/0x8+parseInt(_0x5b2a18(0x14e))/0x9*(-parseInt(_0x5b2a18(0x150))/0xa);if(_0x1e2728===_0x542f9e)break;else _0xfae801['push'](_0xfae801['shift']());}catch(_0x11ab88){_0xfae801['push'](_0xfae801['shift']());}}}(_0x4a36,0x34cfb));return await this[_0x5ec201(0x149)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x1},MessageType[_0x5ec201(0x14c)],{'quoted':quoted,...options});function _0x4a36(){var _0x569e52=['8hXMGdh','1129233GHYvCP','234885rsONiS','1748744AwfLly','sendMessage','78QInsrh','114235hOPZKU','buttonsMessage','1130292QBpsHL','513tefyAa','104770GYvRwO','103680NlqhRL'];_0x4a36=function(){return _0x569e52;};return _0x4a36();}
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
function _0x4d7e(_0x4bff95,_0x30e32a){var _0x4fb4c0=_0x4fb4();return _0x4d7e=function(_0x4d7e08,_0x5bd650){_0x4d7e08=_0x4d7e08-0xf6;var _0x35ebe0=_0x4fb4c0[_0x4d7e08];return _0x35ebe0;},_0x4d7e(_0x4bff95,_0x30e32a);}var _0x15bfbc=_0x4d7e;(function(_0xd81586,_0x2b630f){var _0x545904=_0x4d7e,_0x14fdaf=_0xd81586();while(!![]){try{var _0x327153=-parseInt(_0x545904(0x102))/0x1+parseInt(_0x545904(0xfd))/0x2+parseInt(_0x545904(0xf7))/0x3*(-parseInt(_0x545904(0xfe))/0x4)+-parseInt(_0x545904(0x101))/0x5*(-parseInt(_0x545904(0xfb))/0x6)+parseInt(_0x545904(0xf9))/0x7+parseInt(_0x545904(0xf8))/0x8+-parseInt(_0x545904(0xf6))/0x9;if(_0x327153===_0x2b630f)break;else _0x14fdaf['push'](_0x14fdaf['shift']());}catch(_0x19742b){_0x14fdaf['push'](_0x14fdaf['shift']());}}}(_0x4fb4,0x8801d));return await this[_0x15bfbc(0xfc)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x4,'imageMessage':(await this[_0x15bfbc(0x100)](buffer,MessageType[_0x15bfbc(0xff)],{}))[_0x15bfbc(0xfa)]},MessageType['buttonsMessage'],{'quoted':quoted,...options});function _0x4fb4(){var _0x4deae2=['332868XChozd','sendMessage','735180EDakYg','131476mBYiwv','image','prepareMessageMedia','20kmcWGD','395541uecFje','2595654IEvCWo','63xhhNQs','4128568azIjev','5779956gPVVts','imageMessage'];_0x4fb4=function(){return _0x4deae2;};return _0x4fb4();}
}

//- SEND BUTTON IMG 2
async send2BtnImg(jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}) {
      return await this.sendMessage(jid, {
        contentText: content,
        footerText: footer,
        buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
          { buttonId: row2, buttonText: { displayText: button2 }, type: 1 }
        ],
        headerType: 4,
        imageMessage: (await this.prepareMessageMedia(buffer, MessageType.image, {})).imageMessage
      }, MessageType.buttonsMessage, {
        quoted, ...options
      })
}

//- SEND BUTTON IMG 3
async send3BtnImg(jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
function _0x2778(){var _0x174a98=['3937626nUoZfA','761910edpBDQ','5APvjVM','2631952wjJiNk','7786125tQfWJt','817746CxXvFq','4136956tTDxCe','944875aRJsYK','6SbTKRa','buttonsMessage'];_0x2778=function(){return _0x174a98;};return _0x2778();}function _0x496a(_0x54c878,_0x162481){var _0x277893=_0x2778();return _0x496a=function(_0x496aac,_0x2677da){_0x496aac=_0x496aac-0x166;var _0x2d9ee2=_0x277893[_0x496aac];return _0x2d9ee2;},_0x496a(_0x54c878,_0x162481);}var _0x24c437=_0x496a;(function(_0x5888e9,_0x299361){var _0x3ae1b0=_0x496a,_0x2ea081=_0x5888e9();while(!![]){try{var _0x27a6af=parseInt(_0x3ae1b0(0x16d))/0x1+parseInt(_0x3ae1b0(0x16b))/0x2+parseInt(_0x3ae1b0(0x167))/0x3+-parseInt(_0x3ae1b0(0x16c))/0x4*(parseInt(_0x3ae1b0(0x168))/0x5)+-parseInt(_0x3ae1b0(0x16e))/0x6*(parseInt(_0x3ae1b0(0x166))/0x7)+-parseInt(_0x3ae1b0(0x169))/0x8+parseInt(_0x3ae1b0(0x16a))/0x9;if(_0x27a6af===_0x299361)break;else _0x2ea081['push'](_0x2ea081['shift']());}catch(_0x3a8d1a){_0x2ea081['push'](_0x2ea081['shift']());}}}(_0x2778,0x85914));return await this['sendMessage'](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x4,'imageMessage':(await this['prepareMessageMedia'](buffer,MessageType['image'],{}))['imageMessage']},MessageType[_0x24c437(0x16f)],{'quoted':quoted,...options});
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
var _0x4669a1=_0x1147;(function(_0x4d32a6,_0x1a2837){var _0x5b228f=_0x1147,_0x346c2e=_0x4d32a6();while(!![]){try{var _0x2e8621=-parseInt(_0x5b228f(0x18a))/0x1*(-parseInt(_0x5b228f(0x18f))/0x2)+-parseInt(_0x5b228f(0x186))/0x3+-parseInt(_0x5b228f(0x184))/0x4+-parseInt(_0x5b228f(0x185))/0x5+parseInt(_0x5b228f(0x18b))/0x6+parseInt(_0x5b228f(0x189))/0x7*(parseInt(_0x5b228f(0x18c))/0x8)+parseInt(_0x5b228f(0x190))/0x9;if(_0x2e8621===_0x1a2837)break;else _0x346c2e['push'](_0x346c2e['shift']());}catch(_0x1706f7){_0x346c2e['push'](_0x346c2e['shift']());}}}(_0x5690,0x25447));function _0x1147(_0x41b2e9,_0x1831b7){var _0x569069=_0x5690();return _0x1147=function(_0x114771,_0x43d95e){_0x114771=_0x114771-0x184;var _0x5b7b19=_0x569069[_0x114771];return _0x5b7b19;},_0x1147(_0x41b2e9,_0x1831b7);}return await this[_0x4669a1(0x187)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1}],'headerType':0x5,'videoMessage':(await this[_0x4669a1(0x18d)](buffer,MessageType['video'],{}))[_0x4669a1(0x18e)]},MessageType[_0x4669a1(0x188)],{'quoted':quoted,...options});function _0x5690(){var _0x11c2d7=['2422818KlJHGo','1051972QWFjww','1264700LhmKqG','428601LcTPVP','sendMessage','buttonsMessage','100051LGXkgu','46OgXEDi','1372284adpdwN','88TvAlOy','prepareMessageMedia','videoMessage','6796MeCKdk'];_0x5690=function(){return _0x11c2d7;};return _0x5690();}
}

//- SEND BUTTON VID 2
async send2BtnVid(jid, buffer, content, footer, button1, row1, button2, row2, quoted, options = {}){
var _0x4faf4a=_0x2e69;function _0x2e69(_0x31ae2c,_0x3cc44d){var _0x5b68ab=_0x5b68();return _0x2e69=function(_0x2e6927,_0x327dc7){_0x2e6927=_0x2e6927-0x1c2;var _0x366ccb=_0x5b68ab[_0x2e6927];return _0x366ccb;},_0x2e69(_0x31ae2c,_0x3cc44d);}(function(_0x59b99a,_0x58daae){var _0x24ba07=_0x2e69,_0x23e443=_0x59b99a();while(!![]){try{var _0x2549ea=-parseInt(_0x24ba07(0x1c3))/0x1+parseInt(_0x24ba07(0x1ca))/0x2*(-parseInt(_0x24ba07(0x1c8))/0x3)+parseInt(_0x24ba07(0x1cf))/0x4*(-parseInt(_0x24ba07(0x1c9))/0x5)+parseInt(_0x24ba07(0x1cd))/0x6*(-parseInt(_0x24ba07(0x1c5))/0x7)+-parseInt(_0x24ba07(0x1c6))/0x8*(-parseInt(_0x24ba07(0x1d1))/0x9)+parseInt(_0x24ba07(0x1d0))/0xa*(parseInt(_0x24ba07(0x1c4))/0xb)+parseInt(_0x24ba07(0x1c7))/0xc;if(_0x2549ea===_0x58daae)break;else _0x23e443['push'](_0x23e443['shift']());}catch(_0x425f1d){_0x23e443['push'](_0x23e443['shift']());}}}(_0x5b68,0x3d783));return await this[_0x4faf4a(0x1ce)](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1}],'headerType':0x5,'videoMessage':(await this[_0x4faf4a(0x1c2)](buffer,MessageType['video'],{}))[_0x4faf4a(0x1cb)]},MessageType[_0x4faf4a(0x1cc)],{'quoted':quoted,...options});function _0x5b68(){var _0x5942e6=['prepareMessageMedia','264834qvJXXO','2324630wHyzWH','7VcuLzY','1001968WpUtmK','9057240ucQkUD','5061qbhzzL','5ORSuaU','124PydjmD','videoMessage','buttonsMessage','2155962aaYDyv','sendMessage','944232SEoMjp','10fkgAeZ','18ovpYAM'];_0x5b68=function(){return _0x5942e6;};return _0x5b68();}
}

//- SEND 3 BUTTON VID
async send3BtnVid(jid, buffer, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}){
var _0x5cd397=_0x4f3b;function _0x4f3b(_0xc962eb,_0x1b3f05){var _0x487594=_0x4875();return _0x4f3b=function(_0x4f3b65,_0x149e9a){_0x4f3b65=_0x4f3b65-0x1ac;var _0x3b5400=_0x487594[_0x4f3b65];return _0x3b5400;},_0x4f3b(_0xc962eb,_0x1b3f05);}function _0x4875(){var _0x53180f=['1263423kCmpsS','64HmqIIS','8aFjFJW','video','buttonsMessage','5837680QKfThH','9927974DUSxHF','11kQnNBJ','15884766ksGEvN','prepareMessageMedia','81475abQYDT','12acKADM','45992pnDBrf','videoMessage','9152490cYSUgh'];_0x4875=function(){return _0x53180f;};return _0x4875();}(function(_0x68fcb2,_0x173937){var _0x165067=_0x4f3b,_0x282c8a=_0x68fcb2();while(!![]){try{var _0x2d5def=-parseInt(_0x165067(0x1b7))/0x1*(-parseInt(_0x165067(0x1b3))/0x2)+-parseInt(_0x165067(0x1b6))/0x3+-parseInt(_0x165067(0x1ac))/0x4+parseInt(_0x165067(0x1b1))/0x5*(parseInt(_0x165067(0x1b2))/0x6)+parseInt(_0x165067(0x1ad))/0x7*(-parseInt(_0x165067(0x1b8))/0x8)+parseInt(_0x165067(0x1af))/0x9+parseInt(_0x165067(0x1b5))/0xa*(parseInt(_0x165067(0x1ae))/0xb);if(_0x2d5def===_0x173937)break;else _0x282c8a['push'](_0x282c8a['shift']());}catch(_0x3837b7){_0x282c8a['push'](_0x282c8a['shift']());}}}(_0x4875,0xd83d2));return await this['sendMessage'](jid,{'contentText':content,'footerText':footer,'buttons':[{'buttonId':row1,'buttonText':{'displayText':button1},'type':0x1},{'buttonId':row2,'buttonText':{'displayText':button2},'type':0x1},{'buttonId':row3,'buttonText':{'displayText':button3},'type':0x1}],'headerType':0x5,'videoMessage':(await this[_0x5cd397(0x1b0)](buffer,MessageType[_0x5cd397(0x1b9)],{}))[_0x5cd397(0x1b4)]},MessageType[_0x5cd397(0x1ba)],{'quoted':quoted,...options});
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
