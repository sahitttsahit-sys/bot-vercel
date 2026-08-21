const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
  // Tangani method GET agar tidak error 405
  if (req.method === 'GET') {
    return res.status(200).send('Bot is active and running!');
  }

  if (req.method === 'POST') {
    const update = req.body;
    
    // Cek apakah ini pesan dari Telegram
    if (update.message && update.message.text === '/beli') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const base64Auth = Buffer.from(serverKey + ':').toString('base64');
      
      const orderId = 'TRX-' + Date.now();
      const body = {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: 10000
        }
      };

      try {
        const response = await fetch('https://api.midtrans.com/v2/charge', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + base64Auth
          },
          body: JSON.stringify(body)
        });

        const result = await response.json();
        
        if (result.status_code === '201' && result.actions) {
          const qrAction = result.actions.find(action => action.name === 'generate-qr-code');
          if (qrAction) {
            await bot.telegram.sendPhoto(update.message.chat.id, qrAction.url, {
              caption: `🛒 *Tagihan QRIS Midtrans*\n\nOrder ID: ${orderId}\nTotal: Rp 10.000\nSilakan scan untuk membayar.`
            });
          } else {
            await bot.telegram.sendMessage(update.message.chat.id, 'Gagal: QR Code tidak ditemukan pada respon Midtrans.');
          }
        } else {
          await bot.telegram.sendMessage(update.message.chat.id, 'Gagal dari Midtrans: ' + (result.status_message || 'Terjadi kesalahan'));
        }
      } catch (err) {
        await bot.telegram.sendMessage(update.message.chat.id, 'Error sistem: ' + err.message);
      }
    }
  }
  
  return res.status(200).send('OK');
};
