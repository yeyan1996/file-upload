# 前端大文件上传 + 断点续传解决方案

前端
* vue + element 界面展示
* FileReader + spark-md5 + web-worker 生成文件 hash
* xhr 发送 formData

服务端
* 原生 nodejs
* multiparty 处理 formData

# start

```
npm install
```

```
npm run start
```

文件切片在 .temp 文件夹中临时存储，最后转移到 target 文件夹并合并成一个完整文件
