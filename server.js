const http = require("http");
const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");

const server = http.createServer();
const isJSON = contentType => contentType === "application/json";
const UPLOAD_DIR = path.resolve(__dirname, "temp");

const mergeFileChunk = (writeStream, { filename, index = 0 }) => {
  const chunkPath = `${UPLOAD_DIR}/${filename}-${index}`;
  const readStream = fse.createReadStream(chunkPath);
  // 添加 end 参数，防止响应提前结束
  readStream.pipe(writeStream, { end: false });
  // 当 pipe 结束时，会触发 end 事件
  readStream.on("end", async () => {
    await fse.unlink(chunkPath);
    if (fse.existsSync(`${UPLOAD_DIR}/${filename}-${index + 1}`)) {
      mergeFileChunk(writeStream, {
        filename,
        index: index + 1
      });
    }
  });
};

const handleJSON = (req, res) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", () => {
    const { filename } = JSON.parse(chunk);
    const writeStream = fse.createWriteStream(`${UPLOAD_DIR}/${filename}`);
    mergeFileChunk(writeStream, { filename, index: 0 });
    res.end("file merged success");
  });
};

const handleFormData = (req, res) => {
  const multipart = new multiparty.Form({
    autoFiles: true,
    uploadDir: UPLOAD_DIR
  });

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.warn(err);
      res.status = 500;
      res.end("process file chunk failed");
      return;
    }
    const [file] = files.fileSlice;
    const [name] = fields.name;
    const [index] = fields.index;
    const splitPoint = file.path.lastIndexOf("/");
    await fse.rename(
      file.path,
      `${file.path.slice(0, splitPoint)}/${name}-${index}`
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
