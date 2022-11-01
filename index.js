var Jimp = require("jimp");
const express = require("express");
const app = express();
var cors = require("cors");
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: "ASIA5DYSEEJ4QER7HTPE",
  secretAccessKey: "wRoPccw63WkPPVwe2WKT24wy96ZiS5D7FyD5zQly",
  sessionToken:
    "IQoJb3JpZ2luX2VjEKL//////////wEaDmFwLXNvdXRoZWFzdC0yIkgwRgIhAOmKxGexl2rXh9rBJWVgxKH7nkk2g0+PJnOsBS0F4/xDAiEA/RImJW4BIAuZS9ug6Gm6GJ1Cg7o0JKS9yDCjpGRekB0quQMIi///////////ARACGgw5MDE0NDQyODA5NTMiDHcQFsUOmGmZL0fDpSqNAyhxDpqV3LcOeHaBOn1JPqx1kpxwvZjIwoMq1X8hc2Z9kRtEtLTEcG84DdXppHUts6O/S/iQlPNoYjYWjihgO1WioIY40nBhZ6iMJIz2EHfElCh46VOgsT2hHp7OcqduKNr1c0e4gpGoGq9KZvzc6J1VtKq2wW7Yn770wZsB4Ox0M/y3Sf6WXK9FI4MvS5iXY+w2owya2220Qrsx6TfxRZ/LKWITWzrQF7hHFGEE675fWN+D+Cmy5un/bzLlI1UhBhH5w+MM+RHmEHZNJITMuYAV5iYEne9qZM0uqzMrYvYOPh+KTAdIcSnFqunrtTSik4dQlD8H1C86r2i+3z7OMxLxO6lj1szAx6+k9o4iSD6rujzDNWt/y4ULvOepwOI18XFaWAlZ0z4XdQ8T0z69R+W5MBC9JZdIyl/xUWeLK7QAUFxdr0ENl1G8SdYa0S0pLvPILrUZAMUIxJKIERovlbZ/OzztCND3lfH4sKhWwTmWzNn2X5BOWA8u0lPR2BU02ds3ix/BzgrHEMPCeZ4w4t6DmwY6pQGBac5Ts80tLWvlTc+NqBLe4Yo7SUesJBIb9V4ChzC4XCoeoqtCdd1yxnAVJrYKH9H4se2QxAVFC8ytrJ2aM8uEKBgTHEShzdABbsJDh5hvTqEQ26HaEiEI4Z63BAqozeWfaHJgHI3umPJmLRf8Qv1N+NzaGw9awrMQ/lVRg3wMkrnfSoe7dShwtEMdUm0jl38e4EtAWivlGB+gn3njEkRfxudRMRo=",
});
const fileUpload = require("express-fileupload");
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
    let awsbuf;
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      awsbuf = buffer;
    });
    await s3
      .putObject({
        Bucket: "n11099887wikistore",
        Key: req.files.image.md5 + ".jpg",
        Body: awsbuf,
      })
      .promise();
  });
  res.send("Hello World!");
});

app.listen(3001, () => {
  console.log(`Example app listening at http://localhost:3001`);
});
