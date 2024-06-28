const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const https = require('https');
const axios = require('axios');
const app = express();
const bot = new Telegraf(process.env.TELTOKEN);
const { createCanvas, loadImage, registerFont } = require('canvas');
const otfFontPath = 'ara.otf';
registerFont(otfFontPath, { family: 'Regular' });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });

/* ----- DB Qrs ----- */

async function createUser(user) {
  const { data, error } = await supabase
      .from('users')
      .insert([ user ]);

    if (error) {
      throw new Error('Error creating user : ', error);
    } else {
      return data
    }
};

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from('users')
    .update( update )
    .eq('uid', id);

    if (error) {
      throw new Error('Error updating user : ', error);
    } else {
      return data
    }
};

async function userDb(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId);

  if (error) {
    console.error('Error checking user:', error);
  } else {
    return data
  }
};

app.use(express.json());
app.use(bot.webhookCallback('/bot'))

app.get('/', (req, res) => { res.sendStatus(200) });
  
app.get('/ping', (req, res) => { res.status(200).json({ message: 'Ping successful' }); });

app.get('/prodimage', async (req, res) => {
  const { img, titel, normal, points, superd, limited, shipping, shippingcomp, shippingest, store } = req.query;
  try {
    const squareImagePath = img;
    const squareImage = loadImage(squareImagePath);
    const backgroundImagePath = 'back.png';
    const backgroundImage = loadImage(backgroundImagePath);
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    Promise.all([squareImage, backgroundImage]).then(([squareImg, backgroundImg]) => {
      ctx.drawImage(backgroundImg, 0, 0, canvasWidth, canvasHeight);
      
      const squareSize = 650;
      const scaledSquareImage = resizeImage(squareImg, squareSize, squareSize);
      const centerX = 1544;
      const centerY = 424;
      const xPos = centerX - squareSize / 2;
      const yPos = centerY - squareSize / 2;
      const borderRadius = 53;
      
      ctx.save();
  ctx.beginPath();
  ctx.moveTo(xPos + borderRadius, yPos);
  ctx.arcTo(xPos + squareSize, yPos, xPos + squareSize, yPos + squareSize, borderRadius);
  ctx.arcTo(xPos + squareSize, yPos + squareSize, xPos, yPos + squareSize, borderRadius);
  ctx.arcTo(xPos, yPos + squareSize, xPos, yPos, borderRadius);
  ctx.arcTo(xPos, yPos, xPos + squareSize, yPos, borderRadius);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(scaledSquareImage, xPos, yPos, squareSize, squareSize);
  ctx.restore();

  const rtlText = titel;
  const font = '60px Regular';
  const textColor = 'white';
  const maxWidth = 1200;

  ctx.font = font;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'end';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  const lines = wrapText(rtlText, ctx, ctx.font, maxWidth);
  const lineHeight = parseInt(font, 10);

  const textX = 1190;
  let textY = 130;

  lines.forEach((line) => {
      ctx.fillText(line, textX, textY);
      textY += lineHeight;
  });

  const textData = [
     // { text: '$30.00', x: 1190, y: 130 }, // titel
      { text: `$${normal}`, x: 386, y: 374 , size: 90, color: 'white'}, // normal
      { text: `$${points}`, x: 302, y: 504 , size: 90, color: 'white'}, // points
      { text: `$${superd}`, x: 278, y: 633 , size: 90, color: 'white'}, // superd
      { text: `$${limited}`, x: 313, y: 763 , size: 90, color: 'white'}, // limited
      { text: `الشحن ${shipping}`, x: 1544, y: 888 , size: 50, color: 'white'}, // shipping
      { text: `مع ${shippingcomp}`, x: 1544, y: 950 , size: 50, color: 'white'}, // shippingComp
      { text: `يتوقع الوصول خلال ${shippingest} يوم`, x: 1544, y: 1015 , size: 50, color: 'white'}, // shippingEst
      //{ text: '$30.00', x: 1190, y: 130 }, // stars
     //{ text: '$30.00', x: 1190, y: 130 }, // rates
      //{ text: '$30.00', x: 1190, y: 130 }, // sales
      { text: store, x: 1544, y: 54 , size: 55, color: 'white'}, // store
  ];
  textData.forEach((data) => {
      ctx.font = `${data.size}px Regular`;
      ctx.fillStyle = data.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.text, data.x, data.y, );
      data.y += data.size;
  });

  const resultDataUrl = canvas.toDataURL('image/jpeg');
  const resultBuffer = Buffer.from(resultDataUrl.split(',')[1], 'base64');
  
  res.status(200).contentType('image/jpeg').send(resultBuffer);
});
  } catch (error) {
      console.error('Error generating image:', error);
      res.status(500).send('Internal Server Error');
  }
});

function resizeImage(image, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function wrapText(text, ctx, font, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;

      if (width <= maxWidth) {
          currentLine += ' ' + word;
      } else {
          lines.push(currentLine);
          currentLine = word;
      }
  }

  lines.push(currentLine);
  return lines;
}


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

bot.start(async (ctx) => {
  const user = await userDb(ctx.message.from.id);
  if (user[0]) {
    ctx.reply('مرحبا 😃👋🏻 أنا NotiBest 🤖.\n \n أوفر لك عروض AliExpress 🛒 و الكثير... ✨.\n يمكنك إرسال أي رابط 🔗 و سأقوم بالبحث عن أسعار جديدة لك 👀.\n - لدي الكثير من الخدمات أيضا 🙄:\n \n 📈  • تتبع أسعار المنتجات المشهورة.\n 🏷️  • كوبونات مفيدة للمنتجات.\n 🤩  • تخفيضات و عروض مغرية.\n 🛒  • معلومات تحتاجها قبل الشراء.\n \n ملاحظة : كل الخدمات مجانية 💜. و يمكنك دعمنا عبر الشراء 🛒 من الروابط التي نوفرها لك 🌙.');
  } else {
    await createUser({uid: ctx.message.from.id })
    .then((data, error) => {
      ctx.reply('مرحبا 😃👋🏻 أنا NotiBest 🤖.\n \n أوفر لك عروض AliExpress 🛒 و الكثير... ✨.\n يمكنك إرسال أي رابط 🔗 و سأقوم بالبحث عن أسعار جديدة لك 👀.\n - لدي الكثير من الخدمات أيضا 🙄:\n \n 📈  • تتبع أسعار المنتجات المشهورة.\n 🏷️  • كوبونات مفيدة للمنتجات.\n 🤩  • تخفيضات و عروض مغرية.\n 🛒  • معلومات تحتاجها قبل الشراء.\n \n ملاحظة : كل الخدمات مجانية 💜. و يمكنك دعمنا عبر الشراء 🛒 من الروابط التي نوفرها لك 🌙.');
    });
  }
});

bot.help((ctx) => {
    ctx.reply('معلومات');
});

bot.on('text', async (ctx) => {
    //console.log(ctx.message.from.id);
    // ctx.message.text
    const user = await userDb(ctx.message.from.id);
    if (user[0]) {
      ctx.reply('جاري البحث 🔎...')
    .then(async (message) => {
      const idCatcher = async (id) => {
        if (/^\d+$/.test(id)) { // num test
          return id;
        } else if (/(https?:\/\/[^\s]+)/.test(id) || /(http?:\/\/[^\s]+)/.test(id)){
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
        const resp = await axios.get(`https://nbapi-2.onrender.com/fetch?id=${cid}`);
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
        // `${process.env.RENDER_EXTERNAL_URL}/prodimage?img=${encodeURIComponent(resp.data.normal.image)}&titel=${encodeURIComponent(`المنتج ${resp.data.normal.name}`)}&normal=${encodeURIComponent(resp.data.normal.discountPrice !== "none" ? resp.data.normal.discountPrice : resp.data.normal.price)}&points=${encodeURIComponent(resp.data.points.total)}&superd=${encodeURIComponent(resp.data.super.price)}&limited=${encodeURIComponent(resp.data.limited.price)}&shipping=${encodeURIComponent(resp.data.normal.shipping !== "free" ? resp.data.normal.shipping + "$" : "مجاني")}&shippingcomp=${encodeURIComponent(resp.data.normal.shippingInfo.type)}&shippingest=${encodeURIComponent(resp.data.normal.shippingInfo.deliverRange)}&store=${encodeURIComponent(resp.data.normal.store)}`
        ctx.replyWithPhoto({ url: resp.data.telecover.image },
      {
      caption: `<b>- - - ------------( 🛒 % 🛍 )------------ - - -</b>\n<b>💲 • السعر الاصلي (${resp.data.normal.discountPrice != "none" ? resp.data.normal.discountPrice : resp.data.normal.price}$) :</b>\n\n${resp.data.aff.normal.slice(8)}\n\n<b>⭐️ • تخفيض العملات (${resp.data.points.total}$) :</b>\n\n${resp.data.aff.points.slice(8)}\n\n<b>⚡️ • السوبر ديلز (${resp.data.super.price}$) :</b>\n\n${resp.data.aff.super.slice(8)}\n\n<b>⏱ • العرض المحدود (${resp.data.limited.price}$) :</b>\n\n${resp.data.aff.limited.slice(8)}${copo()}`,
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.url("الفيسبوك 💬", "https://www.facebook.com/NotiBest"),
          Markup.button.url("قناتنا 📣", "https://t.me/NotiBest"),
          Markup.button.url("تتبع طردك 📦", "https://t.me/NotiBest"),
        ],
        [Markup.button.url("موقعنا 🌐", "https://t.me/NotiBest")],
      ])
    }).then(() => {
      ctx.deleteMessage(message.message_id)
    })
  }
});
    } else {
      await createUser({uid: ctx.message.from.id })
      .then((data, error) => {
        ctx.reply('مرحبا 😃👋🏻 أنا NotiBest 🤖.\n \n أوفر لك عروض AliExpress 🛒 و الكثير... ✨.\n يمكنك إرسال أي رابط 🔗 و سأقوم بالبحث عن أسعار جديدة لك 👀.\n - لدي الكثير من الخدمات أيضا 🙄:\n \n 📈  • تتبع أسعار المنتجات المشهورة.\n 🏷️  • كوبونات مفيدة للمنتجات.\n 🤩  • تخفيضات و عروض مغرية.\n 🛒  • معلومات تحتاجها قبل الشراء.\n \n ملاحظة : كل الخدمات مجانية 💜. و يمكنك دعمنا عبر الشراء 🛒 من الروابط التي نوفرها لك 🌙.');
      });
    }
});

// on media
bot.on(["sticker", "animation", "audio", "document", "photo", "video", "video_note", "voice"], (ctx) => {
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
