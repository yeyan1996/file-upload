<template>
  <div id="app">
    <div>
      <input type="file" @change="handleFileChange" />
      <el-button @click="handleUpload">上传</el-button>
    </div>
    <div>
      <div>计算文件 hash</div>
      <el-progress :percentage="hashPercentage"></el-progress>
      <div>总进度</div>
      <el-progress :percentage="uploadPercentage"></el-progress>
    </div>
    <el-table :data="data">
      <el-table-column
        prop="hash"
        label="切片hash"
        align="center"
      ></el-table-column>
      <el-table-column
        prop="size"
        label="大小(B)"
        align="center"
      ></el-table-column>
      <el-table-column label="进度" align="center">
        <template v-slot="{ row }">
          <el-progress :percentage="row.percentage"></el-progress>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
const LENGTH = 10; // 切片数量
import SparkMD5 from "spark-md5";

export default {
  name: "app",
  data: () => ({
    container: {
      file: null,
      hash: ""
    },
    hashPercentage: 0,
    data: [],
    uploadCompleted: false
  }),
  computed: {
    uploadPercentage() {
      if (!this.container.file || !this.data.length) return 0;
      const loaded = this.data
        .map(item => item.size * item.percentage)
        .reduce((acc, cur) => acc + cur);
      return parseInt((loaded / this.container.file.size).toFixed(2));
    }
  },
  methods: {
    // xhr
    request({ url, method = "post", data, headers = {}, onProgress = e => e }) {
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = onProgress;
        xhr.open(method, url);
        Object.keys(headers).forEach(key =>
          xhr.setRequestHeader(key, headers[key])
        );
        xhr.send(data);
        xhr.onload = e => resolve(e);
      });
    },
    // 生成文件切片
    createFileChunk(file, length = LENGTH) {
      const fileChunkList = [];
      const chunkSize = Math.ceil(file.size / length);
      let cur = 0;
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + chunkSize) });
        cur += chunkSize;
      }
      return fileChunkList;
    },
    calculateHash(fileChunkList) {
      return new Promise(resolve => {
        const spark = new SparkMD5.ArrayBuffer();
        let count = 0;
        const loadNext = index => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(fileChunkList[index].file);
          reader.onload = e => {
            count++;
            spark.append(e.target.result);
            this.hashPercentage += 100 / LENGTH;
            if (count === fileChunkList.length) {
              resolve(spark.end());
            } else {
              loadNext(count);
            }
          };
        };
        loadNext(0);
      });
    },
    async handleFileChange(e) {
      Object.assign(this.$data, this.$options.data());
      [this.container.file] = e.target.files;
    },
    async handleUpload() {
      if (!this.container.file || this.uploadCompleted) return;

      const fileChunkList = this.createFileChunk(this.container.file);
      this.container.hash = await this.calculateHash(fileChunkList);

      const shouldUpload = await this.verifyUpload(
        this.container.file.name,
        this.container.hash
      );
      if (!shouldUpload) {
        this.$message.warning("文件已存在");
        this.uploadCompleted = true;
        return;
      }

      this.data = fileChunkList.map(({ file }, index) => ({
        fileHash: this.container.hash,
        hash: this.container.hash + "-" + index,
        chunk: file,
        size: file.size,
        percentage: 0
      }));

      const requestList = this.data
        .map(({ chunk, hash }) => {
          const formData = new FormData();
          formData.append("chunk", chunk);
          formData.append("hash", hash);
          formData.append("filename", this.container.file.name);
          formData.append("fileHash", this.container.hash);
          return formData;
        })
        .map((formData, index) =>
          this.request({
            url: "http://localhost:3000",
            data: formData,
            onProgress: this.createProgressHandler(this.data[index])
          })
        );
      await Promise.all(requestList);
      await this.request({
        url: "http://localhost:3000/merge",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify({
          fileHash: this.container.hash,
          filename: this.container.file.name
        })
      });
      this.$message.success("上传成功");
      this.uploadCompleted = true;
    },
    async verifyUpload(filename, fileHash) {
      const res = await this.request({
        url: "http://localhost:3000/verify",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify({
          filename,
          fileHash
        })
      });
      return JSON.parse(res.target.response).shouldUpload;
    },
    createProgressHandler(item) {
      return e => {
        item.percentage = parseInt(String((e.loaded / e.total) * 100));
      };
    }
  }
};
</script>

<style lang="scss"></style>
