# Implement Large File Upload and Resume Feature

> node 14 is recommended

To retry the upload, you need to delete the file in `/target` directory, otherwise the upload will succeed directly because the server cache the file

download demo file: https://v0c98mphqw.feishu.cn/file/boxcnZ34jCyQziXxsS9NaV0zfre


frontend
* Vue@2
* Element-ui
* Blob#slice: file slice
* FileReader + WebWorker + spark-md5: create file hash
* xhr: send formData

backend
* Nodejs@14
* multiparty: resolve formData

# start

```
npm install
```

```
npm run start
```

# blog
[Interviewer: Please Implement a Large File Upload and Breakpoint Resume](https://medium.com/p/1ca551e43950)
