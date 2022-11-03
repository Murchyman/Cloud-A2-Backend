import { createRequire } from "module";
import { createClient } from "redis";
const require = createRequire(import.meta.url);
require("dotenv").config();
var Jimp = require("jimp");
const express = require("express");
const client = createClient();
const app = express();
var cors = require("cors");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
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
    if (opts.print) image.print(font, 10, 10, opts.print);
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
