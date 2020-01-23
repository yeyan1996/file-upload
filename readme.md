# 前端大文件上传 + 断点续传解决方案

重新演示上传需要删除 /target 中的文件，否则由于服务端保存了文件上传会直接成功

示例文件： /public/WebStorm-2019.3.1.dmg(`非 mac 的朋友自行找测试文件-。-`)


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

# 相关博客
[字节跳动面试官：请你实现一个大文件上传和断点续传](https://juejin.im/post/5dff8a26e51d4558105420ed
)
