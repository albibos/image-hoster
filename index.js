const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "public/upload.html"));
});

app.get("/info", (req, res) => {
  res.sendFile(path.join(__dirname, "public/info.html"));
});

const lastUploads = {};
let imageCount = 0;

setInterval(() => {
  fs.readdir("uploads", (err, files) => {
    if (err) {
      console.error(err);
    } else {
      files.forEach((file) => {
        fs.unlink(path.join("uploads", file), (err) => {
          if (err) {
            console.error(err);
          }
        });
      });
    }
  });
}, 7 * 24 * 60 * 60 * 1000);

app.post("/uploadimg", upload.single("image"), (req, res) => {
  const file = req.file;
  const ip = req.ip;
  const now = Date.now();
  const lastUpload = lastUploads[ip];

  if (lastUpload && now - lastUpload < 60 * 1000) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error(err);
      }
    });

    res.status(429).send("Too many requests. Please wait before uploading again.");
    return;
  }

  lastUploads[ip] = now;

  const ext = path.extname(file.originalname);
  const hash = crypto.randomBytes(8).toString("hex");
  const filename = `${hash}${ext}`;
  const url = `${req.protocol}://${req.get("host")}/${filename}`;

  fs.rename(file.path, path.join("uploads", filename), (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error storing file");
    } else {
      imageCount++;
      if (imageCount >= 20) {
        fs.readdir("uploads", (err, files) => {
          if (err) {
            console.error(err);
          } else {
            files.forEach((file) => {
              fs.unlink(path.join("uploads", file), (err) => {
                if (err) {
                  console.error(err);
                }
              });
            });
          }
        });
        imageCount = 0;
      }
      res.json({ url });
    }
  });
});

app.get("/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "uploads", filename));
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});