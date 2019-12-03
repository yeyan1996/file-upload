const http = require("http");
const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");

const server = http.createServer();
const extractExt = filename =>
  filename.slice(filename.lastIndexOf("."), filename.length);
const TEMP_DIR = path.resolve(__dirname, "..", "target/temp"); // 临时文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录

// 合并切片
const mergeFileChunk = async (filePath, fileHash) => {
  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  const chunkPaths = fse.readdirSync(chunkDir);
  await fse.writeFileSync(filePath, "");
  chunkPaths.forEach(chunkPath => {
    fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
    fse.unlinkSync(`${chunkDir}/${chunkPath}`);
  });

  fse.rmdirSync(chunkDir);
};

const handleMerge = (req, res) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", async () => {
    const { fileHash, filename } = JSON.parse(chunk);
    const ext = extractExt(filename);
    const filePath = `${UPLOAD_DIR}/${fileHash}${ext}`;
    await mergeFileChunk(filePath, fileHash);
    res.end(
      JSON.stringify({
        code: 0,
        message: "file merged success"
      })
    );
  });
};

const handleFormData = async (req, res) => {
  // 临时目录不存在，创建临时目录
  if (!fse.existsSync(TEMP_DIR)) {
    await fse.mkdirs(TEMP_DIR);
  }

  const multipart = new multiparty.Form({
    autoFiles: true,
    uploadDir: TEMP_DIR
  });

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      res.status = 500;
      res.end("process file chunk failed");
      return;
    }
    const [chunk] = files.chunk;
    const [hash] = fields.hash;
    const [fileHash] = fields.fileHash;
    const [filename] = fields.filename;
    const filePath = `${UPLOAD_DIR}/${fileHash}${extractExt(filename)}`;
    const chunkDir = `${UPLOAD_DIR}/${fileHash}`;

    // 文件存在直接返回
    if (fse.existsSync(filePath)) {
      res.end("file exist");
      return;
    }

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }
    await fse.rename(chunk.path, `${chunkDir}/${hash}`);
    res.end("received file chunk");
  });
};

const handleVerifyUpload = (req, res) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", async () => {
    const { fileHash, filename } = JSON.parse(chunk);
    const ext = extractExt(filename);
    const filePath = `${UPLOAD_DIR}/${fileHash}${ext}`;
    if (fse.existsSync(filePath)) {
      res.end(
        JSON.stringify({
          shouldUpload: false
        })
      );
    } else {
      res.end(
        JSON.stringify({
          shouldUpload: true
        })
      );
    }
  });
};

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.status = 200;
    res.end();
    return;
  }
  if (req.url === "/verify") {
    handleVerifyUpload(req, res);
    return;
  }

  if (req.url === "/merge") {
    handleMerge(req, res);
    return;
  }

  await handleFormData(req, res);
});
server.listen(3000, () => console.log("正在监听 3000 端口"));
