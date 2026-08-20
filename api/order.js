const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const fetch = require('node-fetch');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const update = req.body;
    
    if (update.message && update.message.text === '/beli') {
      const va = process.env.IPAYMU_VA;
      const apiKey = process.env.IPAYMU_API_KEY;
      
      const body = {
        product: 'Produk Bot',
        qty: 1,
        price: 10000,
        referenceId: 'TRX' + Date.now(),
        notifyUrl: 'https://' + req.headers.host + '/api/callback',
        paymentMethod: 'qris'
      };

      const bodyJson = JSON.stringify(body);
      const signature = crypto.createHmac('sha256', apiKey).update(Buffer.from(bodyJson, 'utf8')).digest('hex');

      try {
        const response = await fetch('https://my.ipaymu.com/api/v2/payment/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'signature': signature,
            'va': va,
            'timestamp': new Date().toISOString()
          },
          body: bodyJson
        });

        const result = await response.json();
        
        if (result.success) {
          await bot.telegram.sendPhoto(update.message.chat.id, result.data.qrImage, {
            caption: `Silakan bayar Rp 10.000 dengan QRIS di atas.`
          });
        } else {
          await bot.telegram.sendMessage(update.message.chat.id, 'Gagal: ' + result.message);
        }
      } catch (err) {
        await bot.telegram.sendMessage(update.message.chat.id, 'Error koneksi ke iPaymu');
      }
    }
  }
  res.status(200).send('OK');
};
