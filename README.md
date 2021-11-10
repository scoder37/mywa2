<p align="center">
<a href="https://ibb.co/zsnrpRQ"><img src="https://i.ibb.co/pyM9mQX/l7.jpg" alt="l3" border="0"><a>
</p>
<h1 align="center">MyWA Bot</h1>
<h3 align="center">[FREE VERSION]</h3>

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/scoder37/mywa2)

[![Grup WhatsApp](https://img.shields.io/badge/WhatsApp%20Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/Bu5BtQ9kcnIKNGaVR60u9W)

## INSTALASI

* Download & Install Git [`Klik Disini`](https://git-scm.com/downloads)
* Download & Install NodeJS [`Klik Disini`](https://nodejs.org/en/download)
* Downloads & Install FFmpeg [`Klik Disini`](https://ffmpeg.org/download.html)
* Add Ffmpeg to Variable Path
* Download & Install ImageMagick [`Klik Disini`](https://imagemagick.org/script/download.php)
* Register Amirul Dev Get Notification [`Klik Disini`](https://imagemagick.org/script/download.php)

```bash
git clone https://github.com/scoder37/mywa2
cd mywa2
npm i
npm update
edit api get notif (config.js)
node .
```

### Payment Gateway & Mutasi (PRO)
* Ovo, Gopay, Shopeepay, Bca, Bri, Bni (Mutasi)
* Qris, Dana, Bca, Bri, Bni, Mandiri, Briva, Gopay, Shopeepay, Ovo (Payment)
* Alfamart, Alfamidi, Indomaret (Comingsoon)

---------

### Arguments
$ node . [ session ] --options
* contoh: node . kayla --read

#### List Options
* --self : membuat self mode
* --read : mengaktifkan auto read chat & story
* --prf [prefix] : membuat prefix tertentu
* --srv : jika dijalankan di heroku
* --bigqr : jika qr unicode tidak mendukung
* --restrict : aktifkan untuk mencegah nomor diblokir wa
* --img : mengaktifkan pemeriksa gambar via terminal
* --nyimak : no bot, hanya cetak pesan yang diterima dan tambahkan pengguna ke database
* --test : testing develoment
* --trace
```js
conn.logger.level = 'trace'
```
* --debug
```js
conn.logger.level = 'debug'
```
* --db [url server] : untuk menggunakan db eksternal

#NB:
jika menggunakan db eksternal, seever harus memiliki spesifikasi seperti berikut

#### GET

```http
GET /
Accept: application/json
```

#### POST

```http
POST /
Content-Type: application/json

{
 data: {}
}
```

 [![amiruldev20](https://avatars.githubusercontent.com/u/73012169?v=4?size=100)](https://github.com/amiruldev20) | [![scoder37](https://avatars.githubusercontent.com/u/90820338?v=4?size=100)](https://github.com/scoder37)
----|----
[Amirul Dev](https://github.com/amiruldev20) | [Kayla](https://github.com/scoder37)
 Creator | Developer
