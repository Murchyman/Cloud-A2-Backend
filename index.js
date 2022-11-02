import { createRequire } from "module";
import { createClient } from "redis";
const require = createRequire(import.meta.url);
var Jimp = require("jimp");
const express = require("express");
const client = createClient();
const app = express();
var cors = require("cors");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: "ASIA5DYSEEJ4QOSLOT7H",
  secretAccessKey: "vQxuqmJIApDgAKmWyREMbmQNBZKB09p92O3ZkQ1u",
  sessionToken:
    "IQoJb3JpZ2luX2VjELb//////////wEaDmFwLXNvdXRoZWFzdC0yIkYwRAIgcQmNdkRAIVmOPoyU63vyI5KWNFd8f+YBn8O9dcdxO3gCIFtakmAL3MLJ9GhTk4vLt9C9C0W7oVLklRQ9XP9UbyQSKrkDCJ///////////wEQAhoMOTAxNDQ0MjgwOTUzIgzRjrs9zytdeckX5H8qjQNF1qskXT2/g/vS+iI7/UqhMumjXNjZeKlFEc1wjFtwdAUoDwKvMoDQLENB6bOhJPoijp63mJsB4TXJTRUwdqDkc6VpjrzlOm21nyfab408QZotghmLDsUwl1LXfc/jswDBfcVfNJ+Rmy0CF8/OH0q+wF0AViMHVluBlmL/trKaqP3g9/wl0HRXXoHBTo90tK0H/Un18/7PjTjl9uPXi8Su8c3MxU61GLFhPeZ9gJARhS+GhugL1Spb02oy64YhucdGSa9cIKykuwVO06vVEASvAO8MVZPgej/jEOt1vCXr0x5hSsyiBpbI2Ys/pRLh9jd5bwQnwRICutsjfUEqWaqoN1O1wRFM3chlxOviSis/btio4JbDOnhhEwsWvbc6tIW5cac3nu5O1zCh3/O2/jKVIP6nNGQf+RUFQ5Qveu9WxUwbXXafV0kCcHvENQZci+ih9SGu5Jf+mkQRUhkuJWxJgFyzOxdCCYcnEGpaaw66udtQ22Lg8ORaQsNAssWJ6pZPdWEaM1zlT6IYXuiVMMKUiJsGOqcBcKkt0ggKftinDCs8YvLUURyyqS909q5W1wKDwROWK7yedhYH/OPLXivYYL2kI6Ux2lzLqpaXw652ofaWy9dxekwnRjeN7DrwpQoI/gKWCJ2cXJxAYkfR5Gs2afUXtK4/P0syblrdXYPtY2/s3B/dV9v1udObP3q04Fts2+aF0whWfkGamx028BAUgANB8MlU8devJH6BZD1Y4cGlHMoyAMJmEaflA6k=",
});
const fileUpload = require("express-fileupload");
client.on("error", (err) => console.log("Redis Client Error", err));
await client.connect();
app.use(fileUpload());
app.use(cors());
app.post("/upload", async (req, res) => {
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const opts = JSON.parse(req.body.opts);
  Jimp.read(req.files.image.data, async function (err, image) {
    if (err) throw err;
    image.resize(256, 256); // resize
    if (opts.greyscale) image.greyscale();
    if (opts.dither) image.dither565();
    if (opts.invert) image.invert();
    if (opts.gaussian) image.gaussian(3);
    if (opts.print) image.print(font, 10, 10, "Hello world!");
    image.write("image.jpg");
    let finalbuf;
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      finalbuf = buffer;
    });
    await s3
      .putObject({
        Bucket: "n11099887wikistore",
        Key: req.files.image.md5,
        Body: finalbuf,
      })
      .promise();
    await client.set(req.files.image.md5, finalbuf.toString("base64"));
    res.send({
      key: req.files.image.md5,
      data: finalbuf.toString("base64"),
      origin: "live",
    });
  });
});

app.get("/getData", async (req, res) => {
  const params = {
    Bucket: "n11099887wikistore",
  };
  //return an array of objects containing the keys, data and origin of each item in the bucket, first check if the key is in the redis cache, if not, get it from the bucket and add it to the cache then return the array
  const data = await s3.listObjectsV2(params).promise();
  const keys = data.Contents.map((item) => item.Key);
  res.send(
    await Promise.all(
      keys.map(async (key) => {
        const cached = await client.get(key);
        if (cached) {
          return {
            key,
            data: cached,
            origin: "cache",
          };
        } else {
          const data = await s3
            .getObject({
              Bucket: "n11099887wikistore",
              Key: key,
            })
            .promise();
          await client.set(key, data.Body.toString("base64"));
          return {
            key,
            data: data.Body.toString("base64"),
            origin: "bucket",
          };
        }
      })
    )
  );
});

app.listen(3001, () => {
  console.log(`Example app listening at http://localhost:3001`);
});
