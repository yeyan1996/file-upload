# implement large file upload and resume feature

> node14 is recommended

To retry the upload, you need to delete the file in /target directory, otherwise the upload will succeed directly because the server cache the file

demo： /public/video.flv


frontend
* vue + element: ui
* Blob#slice: file slice
* FileReader + spark-md5 + web-worker: create file hash
* xhr: send formData

backend
* nodejs
* multiparty: resolve formData

# start

``
npm install
```

 ```
npm run start
```
