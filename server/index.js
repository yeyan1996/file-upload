const http = require("http");
const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");

const server = http.createServer();
const isJSON = contentType => contentType === "application/json";
const TEMP_DIR = path.resolve(__dirname, "..", "temp"); // 分片存储目录
const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录

const mergeFileChunk = (writeStream, chunkHash) => {
  const chunkPath = `${TEMP_DIR}/${chunkHash}`;
  const readStream = fse.createReadStream(chunkPath);
  // 添加 end 参数，防止响应提前结束
  readStream.pipe(writeStream, { end: false });
  // 当 pipe 结束时，会触发 end 事件
  readStream.on("end", async () => {
    await fse.unlink(chunkPath);
  });
};

const handleJSON = (req, res) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", async () => {
    const { fileHash, chunkHashList } = JSON.parse(chunk);
    const targetPath = `${UPLOAD_DIR}/${fileHash}`;
    if (fse.existsSync(targetPath)) {
      res.end("file exist,skip merge");
      return;
    }
    const writeStream = fse.createWriteStream(`${UPLOAD_DIR}/${fileHash}`);
    chunkHashList.forEach(chunkHash => mergeFileChunk(writeStream, chunkHash));
    res.end("file merged success");
  });
};

const handleFormData = (req, res) => {
  const multipart = new multiparty.Form({
    autoFiles: true,
    uploadDir: TEMP_DIR
  });

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.warn(err);
      res.status = 500;
      res.end("process file chunk failed");
      return;
    }
    const [chunk] = files.chunk;
    const [chunkHash] = fields.chunkHash;
    const splitPoint = chunk.path.lastIndexOf("/");
    await fse.rename(
      chunk.path,
      `${chunk.path.slice(0, splitPoint)}/${chunkHash}`
    );
    res.end("received file chunk");
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
  const contentType = req.headers["content-type"];
  isJSON(contentType) ? handleJSON(req, res) : handleFormData(req, res);
});
server.listen(3000, () => console.log("正在监听 3000 端口"));
