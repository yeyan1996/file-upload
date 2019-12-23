const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");

const extractExt = filename =>
  filename.slice(filename.lastIndexOf("."), filename.length); // 提取后缀名
const TEMP_DIR = path.resolve(__dirname, "..", ".temp"); // 临时文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录

// 合并切片
const mergeFileChunk = async (filePath, fileHash) => {
  const chunkDir = `${UPLOAD_DIR}/${fileHash}`;
  const chunkPaths = await fse.readdir(chunkDir);
  await fse.writeFile(filePath, "");
  chunkPaths.forEach(chunkPath => {
    fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}/${chunkPath}`));
    fse.unlinkSync(`${chunkDir}/${chunkPath}`);
  });
  fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
};

const resolvePost = (req, cb) => {
  let chunk = "";
  req.on("data", data => {
    chunk += data;
  });
  req.on("end", () => {
    cb(chunk);
  });
};

// 生成已经上传的切片下标
const createUploadedList = async fileHash => {
  if (fse.existsSync(`${UPLOAD_DIR}/${fileHash}`)) {
    const chunksName = await fse.readdir(`${UPLOAD_DIR}/${fileHash}`);
    return chunksName.map(chunkName =>
      Number(chunkName.slice(chunkName.lastIndexOf("-") + 1, chunkName.length))
    );
  } else {
    return [];
  }
};

module.exports = class {
  // 恢复
  handleResume(req, res) {
    resolvePost(req, async data => {
      const { fileHash } = JSON.parse(data);
      res.end(
        JSON.stringify({
          uploadedList: await createUploadedList(fileHash)
        })
      );
    });
  }
  // 合并切片
  handleMerge(req, res) {
    resolvePost(req, async data => {
      const { fileHash, filename } = JSON.parse(data);
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
  }
  // 处理切片
  async handleFormData(req, res) {
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
  }
  // 验证是否已上传/已上传切片下标
  handleVerifyUpload(req, res) {
    resolvePost(req, async data => {
      const { fileHash, filename } = JSON.parse(data);
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
            shouldUpload: true,
            uploadedList: await createUploadedList(fileHash)
          })
        );
      }
    });
  }
};
