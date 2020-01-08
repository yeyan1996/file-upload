# 前端大文件上传 + 断点续传解决方案

使用前请打开 chrome 开发工具的 network 选项，设置网络节流为 Fast 3G，否则上传速度太快断点续传会无法使用-。-

![](https://tva1.sinaimg.cn/large/006tNbRwgy1ga5u984kjnj30ni0cajwe.jpg)


重新演示上传需要删除 /target 中的文件，否则由于服务端保存了文件上传会直接成功

示例文件： /public/林俊杰-我们很好.mp3


前端
* vue + element 界面展示
* Blob#slice 实现文件切片
* FileReader + spark-md5 + web-worker 生成文件 hash
* xhr 发送 formData

服务端
* nodejs
* multiparty 处理 formData

# start

```
npm install
```

```
npm run start
```
