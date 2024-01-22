const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const axios = require('axios');
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
    .then(async (message) => {
      const idCatcher = async (id) => {
        if (/^\d+$/.test(id)) { // num test
          return id;
        } else if (/(https?:\/\/[^\s]+)/.test(id)){
          if (id.includes("aliexpress.com")) {
            if (/\/(\d+)\.html/.test(id)) {
              return id.match(/\/(\d+)\.html/)[1];
            } else {
              try {
                const response = await axios.head(id, { maxRedirects: 0, validateStatus: (status) => status >= 200 && status < 400 });
                const decodedUrl = decodeURIComponent(response.headers.location);
                const regex = /\/(\d+)\.html/;
                const match = decodedUrl.match(regex);
                if (match && match[1]) {
                  return match[1];
                } else if (decodedUrl.includes('/item/')) {
                  // Handle the additional AliExpress URL pattern directly
                  const regexItem = /\/(\d+)\.html/;
                  const matchItem = decodedUrl.match(regexItem);
                  if (matchItem && matchItem[1]) {
                    return matchItem[1];
                  }
                }
              } catch (error) {
                return null;
              }
            }
          } else {
            return null;
          }
        } else {
          return null;
        }
        return null;
      };
      const cid = await idCatcher(ctx.message.text);
      if (cid == null) {
        ctx.reply('المرجو إرسال روابط علي اكسبرس فقط').then(() => {
          ctx.deleteMessage(message.message_id)
        });
      } else {
        const resp = await axios.get(`https://nbapi.onrender.com/fetch?id=${cid}`);
        const copo = () => {
          if (resp.data.normal.coupon != "none") {
            let shp = "\n\n<b>- - - -------------( 🏷️ ✓ 💰 )------------- - - -</b>\n";
            resp.data.normal.coupon.forEach((c, index) => {
              if (index === resp.data.normal.coupon.length - 1) {
                shp += `\n<b>🏷 • تخفيض ${c.desc}$ على طلبات التي تزيد عن ${c.on}$ [ <code>${c.code}</code> ].</b>\n\nBy @NotiBestBot`
              } else {
                shp += `\n<b>🏷 • تخفيض ${c.desc}$ على طلبات التي تزيد عن ${c.on}$ [ <code>${c.code}</code> ].</b>\n`
              }
            });
            return shp;
          } else {
            return "\n\nBy @NotiBestBot";
          }
        }; 
        // encodeURIComponent()
        ctx.replyWithPhoto({ url: `https://nbcovtest.onrender.com/prodimage?img=${encodeURIComponent(resp.data.normal.image)}&titel=${encodeURIComponent(`المنتج ${resp.data.normal.name}`)}&normal=${encodeURIComponent(resp.data.normal.discountPrice !== "none" ? resp.data.normal.discountPrice : resp.data.normal.price)}&points=${encodeURIComponent(resp.data.points.total)}&superd=${encodeURIComponent(resp.data.super.price)}&limited=${encodeURIComponent(resp.data.limited.price)}&shipping=${encodeURIComponent(resp.data.normal.shipping !== "free" ? resp.data.normal.shipping + "$" : "مجاني")}&shippingcomp=${encodeURIComponent(resp.data.normal.shippingInfo.type)}&shippingest=${encodeURIComponent(resp.data.normal.shippingInfo.deliverRange)}&store=${encodeURIComponent(resp.data.normal.store)}` },
      {
      caption: `<b>- - - ------------( 🛒 % 🛍 )------------ - - -</b>\n<b>💲 • السعر الاصلي ($${resp.data.normal.discountPrice != "none" ? resp.data.normal.discountPrice : resp.data.normal.price}) :</b>\n\n${resp.data.aff.normal}\n<b>⭐️ • تخفيض العملات ($${resp.data.points.total}) :</b>\n\n${resp.data.aff.points}\n<b>⚡️ • السوبر ديلز ($${resp.data.super.price}) :</b>\n\n${resp.data.aff.super}\n<b>⏱ • العرض المحدود ($${resp.data.limited.price}) :</b>\n\n${resp.data.aff.limited}${copo()}`,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        Markup.button.callback("زر عادي", "plain"),
        Markup.button.url("زر رابط", "https://www.npmjs.com/"),
      ])
    }).then(() => {
      ctx.deleteMessage(message.message_id)
    })
  }
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