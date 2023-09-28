# 前端大文件上传 + 断点续传解决方案

[English](./README.md) | 中文

[博客地址](https://juejin.im/post/5dff8a26e51d4558105420ed)

> 推荐使用 Nodejs14

重新演示上传需要删除 /target 中的文件，否则由于服务端保存了文件上传会直接成功

示例大文件下载：https://v0c98mphqw.feishu.cn/file/boxcnZ34jCyQziXxsS9NaV0zfre


前端
* Vue@2
* Element-ui  
* Blob#slice 实现文件切片
* FileReader + WebWorker + spark-md5 生成文件 hash
* xhr 发送 formData

服务端
* Nodejs@14
* multiparty 处理 formData

# start

```
npm install
```

```
npm run start
```

