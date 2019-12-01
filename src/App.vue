<template>
  <div id="app">
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">上传</el-button>
    <div>
      <div>总进度</div>
      <el-progress :percentage="totalPercentage"></el-progress>
    </div>
    <el-table :data="data">
      <el-table-column
        prop="chunkHash"
        label="切片hash"
        align="center"
      ></el-table-column>
      <el-table-column
        lable="大小"
        align="center"
        prop="size"
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
const LENGTH = 5; // 切片数量

export default {
  name: "app",
  data: () => ({
    container: {
      file: null,
      hash: ""
    },
    data: []
  }),
  computed: {
    totalPercentage() {
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
    // 提取扩展名
    extractExt(file) {
      return file.name.slice(file.name.lastIndexOf("."), file.name.length);
    },
    // 生成文件切片
    createFileChunk(file, length = LENGTH) {
      const fileChunkList = [];
      const chunkSize = Math.ceil(file.size / length);
      let cur = 0;
      while (cur < file.size) {
        fileChunkList.push(file.slice(cur, cur + chunkSize));
        cur += chunkSize;
      }
      return fileChunkList;
    },
    // 生成切片 hash
    async createFileHash(file) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = e => {
          const spark = new window.SparkMD5.ArrayBuffer();
          spark.append(e.target.result);
          resolve(spark.end());
        };
      });
    },
    async handleFileChange(e) {
      Object.assign(this.$data, this.$options.data());
      [this.container.file] = e.target.files;
      this.container.hash = await this.createFileHash(this.container.file);
    },
    async handleUpload() {
      if (!this.container.file) return;
      const fileChunkList = this.createFileChunk(this.container.file);

      const chunkHashList = await Promise.all(
        fileChunkList.map(fileChunk => this.createFileHash(fileChunk))
      );

      this.data = chunkHashList.map((chunkHash, index) => ({
        chunkHash,
        chunk: fileChunkList[index],
        size: fileChunkList[index].size,
        percentage: 0
      }));

      const requestList = this.data
        .map(item => item.chunk)
        .map((chunk, index) => {
          const formData = new FormData();
          formData.append("chunk", chunk);
          formData.append("chunkHash", this.data[index].chunkHash);
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
      this.request({
        url: "http://localhost:3000",
        headers: {
          "content-type": "application/json"
        },
        data: JSON.stringify({
          fileHash: this.container.hash + this.extractExt(this.container.file),
          chunkHashList: this.data.map(item => item.chunkHash)
        })
      });
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
