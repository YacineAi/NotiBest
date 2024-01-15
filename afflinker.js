const crypto = require("crypto");
const axios = require('axios');

const API_URL = "https://api-sg.aliexpress.com/sync";
const API_SECRET = process.env.SECRET;

const hash = (method, s, format) => {
  const sum = crypto.createHash(method);
  const isBuffer = Buffer.isBuffer(s);
  if (!isBuffer && typeof s === "object") {
    s = JSON.stringify(sortObject(s));
  }
  sum.update(s, "utf8");
  return sum.digest(format || "hex");
};

const sortObject = (obj) => {
  return Object.keys(obj)
    .sort()
    .reduce(function (result, key) {
      result[key] = obj[key];
      return result;
    }, {});
};

const signRequest = (parameters) => {
  const sortedParams = sortObject(parameters);
  const sortedString = Object.keys(sortedParams).reduce((acc, objKey) => {
    return `${acc}${objKey}${sortedParams[objKey]}`;
  }, "");
  const bookstandString = `${API_SECRET}${sortedString}${API_SECRET}`;
  const signedString = hash("md5", bookstandString, "hex");
  return signedString.toUpperCase();
};

const getData = async (id) => {
    const payload = {
        app_key: "503698",
        sign_method: "md5",
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        format: "json",
        v: "2.0",
        method: "aliexpress.affiliate.link.generate",
        promotion_link_type: 0,
        tracking_id: "Yacine",
        source_values: `https://ar.aliexpress.com/i/${id}.html,https://ar.aliexpress.com/i/${id}.html?sourceType=620&aff_fcid=,https://ar.aliexpress.com/i/${id}.html?sourceType=562&aff_fcid=,https://ar.aliexpress.com/i/${id}.html?sourceType=561&aff_fcid=`,
      };
      const sign = signRequest(payload);
      const allParams = {
        ...payload,
        sign,
      };
      try {
        const responses = await Promise.all([ axios.post(API_URL, new URLSearchParams(allParams)), axios.get(`https://coinzy-u0g3.onrender.com/fetch?id=${id}`)]);
        const affRes = {};
        responses.forEach((response, index) => {
            switch (index) {
                case 0: // aff 
                const mappedData = response.data.aliexpress_affiliate_link_generate_response.resp_result.result.promotion_links.promotion_link.reduce((result, item) => {
                    const sourceValue = item.source_value;
                    let key = 'normal';
                    if (sourceValue) {
                        if (sourceValue.includes('sourceType=561')) {
                        key = 'limited';
                      } else if (sourceValue.includes('sourceType=562')) {
                        key = 'super';
                      } else if (sourceValue.includes('sourceType=620')) {
                        key = 'points';
                      }
                    }
                    result[key] = item.promotion_link;
                    return result;
                  }, {});
                affRes['aff'] = mappedData;
                break;
                case 1: // info
                affRes['info'] = response.data;
                break;
              }
        });
        return affRes
      } catch (error) {
        console.error("Error:", error);
      }
};

exports.getData = getData;