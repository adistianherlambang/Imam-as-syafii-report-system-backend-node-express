require('dotenv').config();

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const TelegramBot = require('node-telegram-bot-api')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

const upload = multer({ dest: 'uploads/' })

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_API;
const CHAT_IDS_FILE = path.join(__dirname, 'chatid.json')

app.use(cors());
app.use(express.json()); // Tambahkan agar bisa menerima JSON dari Telegram webhook

// Inisialisasi bot tanpa polling
const bot = new TelegramBot(TELEGRAM_TOKEN);

// Endpoint untuk menerima webhook dari Telegram
app.post('/api/main', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Set webhook (jalankan sekali secara manual, bukan di serverless)
// bot.setWebHook('https://your-vercel-domain.vercel.app/api/main');

// Handler bot.onText tetap sama
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;

    let chatIds = readChatIds();

    if (!chatIds.includes(chatId)) {
        chatIds.push(chatId);
        saveChatIds(chatIds);
    }

    bot.sendMessage(chatId, `Assalamu'alaikum, ${userName}! Anda akan menerima laporan pengaduan di sini, Barakallahu fiikum.`);
    console.log(`Chat ID: ${chatId}`);
});

app.get('/', (req, res) => {
    res.send('Server is running')
})
app.post('/', upload.single('image'), async (req, res) => {
    const data = req.body
    const file = req.file
    res.json({ message: 'ok' })
    let message = `
<b>Laporan Baru</b>
Nama: ${data.nama}
NIP: ${data.nip}
Jenis: ${data.option}
Tanggal & Lokasi: ${data.tanggalLokasi}
Rincian: ${data.rincian}
`

    try {
        const chatIds = readChatIds();
        // if (chatIds.length === 0) {
        //     return res.status(400).json({ message: 'Belum ada chat id yang terdaftar. Kirim /start ke bot dulu.' });
        // }
        for (const chatId of chatIds) {
            if (file) {
                await bot.sendPhoto(chatId, fs.createReadStream(file.path), {
                    caption: message,
                    parse_mode: 'HTML'
                })
            } else {
                await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
            }
        }
        if (file) fs.unlinkSync(file.path)
        // res.json({ message: 'Laporan berhasil dikirim!' })
    } catch (err) {
        console.error(err)
        // res.status(500).json({ message: 'Gagal mengirim ke Telegram.' })
    }
})

// app.listen(PORT, () => {
//     console.log(`server berjalan di port: ${PORT}`)
// })

function readChatIds() {
    try {
        if (!fs.existsSync(CHAT_IDS_FILE)) return [];
        const data = fs.readFileSync(CHAT_IDS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}
function saveChatIds(chatIds) {
    fs.writeFileSync(CHAT_IDS_FILE, JSON.stringify(chatIds, null, 2))
}

module.exports = app; // Export Express app for Vercel serverless function