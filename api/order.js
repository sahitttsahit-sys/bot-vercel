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
        product: ['Produk Bot'],
        qty: [1],
        price: [10000],
        returnUrl: 'https://' + req.headers.host,
        notifyUrl: 'https://' + req.headers.host + '/api/callback',
        referenceId: 'TRX' + Date.now(),
        paymentMethod: 'qris',
        channel: 'qris'
      };

      try {
        const jsonBody = JSON.stringify(body);
        const hashBody = crypto.createHash('sha256').update(jsonBody).digest('hex');
        const stringToSign = `POST:${va}:${hashBody}:${apiKey}`;
        const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');

        const response = await fetch('https://my.ipaymu.com/api/v2/payment/direct', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'va': va,
            'signature': signature,
            'timestamp': Math.floor(Date.now() / 1000).toString()
          },
          body: jsonBody
        });

        const result = await response.json();
        
        if (result.success && result.data && result.data.qrImage) {
          await bot.telegram.sendPhoto(update.message.chat.id, result.data.qrImage, {
            caption: `🛒 *Tagihan QRIS iPaymu*\n\nTotal: Rp 10.000\nSilakan scan untuk membayar.`
          });
        } else {
          const errMsg = result.message || 'Respon iPaymu tidak valid';
          await bot.telegram.sendMessage(update.message.chat.id, 'Gagal dari iPaymu: ' + errMsg);
        }
      } catch (err) {
        await bot.telegram.sendMessage(update.message.chat.id, 'Error sistem: ' + err.message);
      }
    }
  }
  res.status(200).send('OK');
};
