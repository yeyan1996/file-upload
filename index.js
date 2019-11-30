let container;
const input = document.querySelector("input");
const button = document.querySelector("button");
const MAX_SIZE = 1024 * 1024; // 1M

const request = ({ url, method = "post", data, headers = {} }) => {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.keys(headers).forEach(key =>
      xhr.setRequestHeader(key, headers[key])
    );
    xhr.send(data);
    xhr.onload = e => resolve(e);
  });
};

const createFileChunk = (file, size = MAX_SIZE) => {
  const fileChunkList = [];
  let cur = 0;
  while (cur < file.size) {
    fileChunkList.push(file.slice(cur, cur + size));
    cur += size;
  }
  return fileChunkList;
};

input.addEventListener("change", e => {
  [container] = e.target.files;
});

button.addEventListener("click", async () => {
  if (!container) return;
  const fileChunkList = createFileChunk(container);
  const requestFileList = fileChunkList
    .map((fileChunk, index) => {
      const formData = new FormData();
      formData.append("chunk", fileChunk);
      formData.append("index", String(index));
      formData.append("name", container.name);
      return formData;
    })
    .map(formData =>
      request({
        url: "http://localhost:3000",
        data: formData
      })
    );
  await Promise.all(requestFileList);
  request({
    url: "http://localhost:3000",
    headers: {
      "content-type": "application/json"
    },
    data: JSON.stringify({
      filename: container.name
    })
  });
});
