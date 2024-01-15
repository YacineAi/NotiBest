const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const affData = require("./afflinker.js");
const app = express();
const bot = new Telegraf(process.env.TELTOKEN);

app.use(express.json());
app.use(bot.webhookCallback('/bot'))

app.get('/', (req, res) => { res.sendStatus(200) });
  
app.get('/ping', (req, res) => { res.status(200).json({ message: 'Ping successful' }); });

function keepAppRunning() {
    setInterval(() => {
        https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
            if (resp.statusCode === 200) {
                console.log('Ping successful');
            } else {
                console.error('Ping failed');
            }
        });
    }, 5 * 60 * 1000);
}


/* ------ TELEGRAF ------ */

bot.start((ctx) => {
    ctx.reply('مرحبا 😃👋🏻 أنا NotiBest 🤖.\n \n أوفر لك عروض AliExpress 🛒 و الكثير... ✨.\n يمكنك إرسال أي رابط 🔗 و سأقوم بالبحث عن أسعار جديدة لك 👀.\n - لدي الكثير من الخدمات أيضا 🙄:\n \n 📈  • تتبع أسعار المنتجات المشهورة.\n 🏷️  • كوبونات مفيدة للمنتجات.\n 🤩  • تخفيضات و عروض مغرية.\n 🛒  • معلومات تحتاجها قبل الشراء.\n \n ملاحظة : كل الخدمات مجانية 💜. و يمكنك دعمنا عبر الشراء 🛒 من الروابط التي نوفرها لك 🌙.');
});

bot.help((ctx) => {
    ctx.reply('معلومات');
});

bot.on('text', (ctx) => {
    //console.log(ctx.message.from);
    // ctx.message.text

    ctx.reply('جاري البحث 🔎...')
    .then((message) => {
      affData.getData(ctx.message.text)
      .then((coinPi) => {
        // console.log("coinPi : ", coinPi)
        ctx.replyWithPhoto({ url: 'https://i.ibb.co/nw9LR6R/notibest-Soon.png' },
            // ${coinPi.aff.normal} / limited / super / points /
            // ${coinPi.info.super.price}
          {
            
            caption: `
  <b>-----------✨ تخفيض الاسعار ✨-----------</b>
  
  ${coinPi.info.normal.name}.
  
  <b>الشحن</b> : ${coinPi.info.normal.shipping}.
  <b>إسم المتجر</b> : ${coinPi.info.normal.store}.
  <b>تقييم المتجر</b> : ${coinPi.info.normal.storeRate}.
  
  <b>----------- |✨ التخفيضات ✨| -----------</b>
  
  <b>السعر الاصلي</b> : (${coinPi.info.normal.discountPrice})
  ${coinPi.aff.normal}
  
  <b>تخفيض العملات</b> : (${coinPi.info.points.discount})
  ${coinPi.aff.points}
  
  <b>تخفيض السوبر</b> : (${coinPi.info.super.price})
  ${coinPi.aff.super}
  
  <b>تخفيض العرض المحدود</b> : (${coinPi.info.limited.price})
  ${coinPi.aff.limited}`,
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
              Markup.button.callback("زر عادي", "plain"),
              Markup.button.url("زر رابط", "https://www.npmjs.com/"),
            ])
          }).then(() => {
            ctx.deleteMessage(message.message_id)
        })
  
      });
    });
  });

// on media
bot.on('sticker' || 'animation' || 'audio' || 'sticker' || 'document' || 'photo' || 'video' || 'video_note' || 'voice', (ctx) => {
    ctx.reply('المرجو إرسال روابط علي اكسبرس فقط');
});


// postback
bot.on('callback_query', (ctx) => {
    console.log("callback_query ctx : ", ctx)
});

/* ------ END TELEGRAF ------ */

app.listen(3000, () => {
  bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot`)
  .then(() => {
    console.log('Webhook Set ✅ & Server is running on port 3000 💻');
    keepAppRunning();
  });
});