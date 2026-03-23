const config = require("../config");

function isCloudFileId(value) {
  return typeof value === "string" && value.indexOf("cloud://") === 0;
}

function buildCloudPath(filePath, namespace) {
  const extensionMatch = String(filePath || "").match(/\.[^./?]+$/);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : ".jpg";
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 10);
  return `takeaway/${namespace}/${datePart}-${Date.now()}-${random}${extension}`;
}

function uploadImageToCloud(filePath, namespace) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject({ detail: "当前基础库不支持云存储" });
      return;
    }
    wx.cloud.uploadFile({
      cloudPath: buildCloudPath(filePath, namespace),
      filePath,
      success(res) {
        resolve({
          image_url: res.fileID || "",
          file_id: res.fileID || "",
          preview_url: filePath
        });
      },
      fail(error) {
        reject(error || { detail: "云存储上传失败" });
      }
    });
  });
}

function getTempFileURL(fileRef) {
  return new Promise((resolve, reject) => {
    if (!fileRef) {
      resolve("");
      return;
    }
    if (!isCloudFileId(fileRef)) {
      resolve(fileRef);
      return;
    }
    if (!wx.cloud) {
      reject({ detail: "当前基础库不支持云存储" });
      return;
    }
    wx.cloud.getTempFileURL({
      fileList: [fileRef],
      success(res) {
        const file = ((res && res.fileList) || [])[0] || {};
        resolve(file.tempFileURL || "");
      },
      fail(error) {
        reject(error || { detail: "云文件链接获取失败" });
      }
    });
  });
}

function resolveFileRefs(fileRefs = []) {
  return new Promise((resolve, reject) => {
    const uniqueRefs = Array.from(new Set((fileRefs || []).filter(Boolean)));
    const resolvedMap = {};
    uniqueRefs.forEach((ref) => {
      if (!isCloudFileId(ref)) {
        resolvedMap[ref] = ref;
      }
    });
    const cloudRefs = uniqueRefs.filter((ref) => isCloudFileId(ref));
    if (!cloudRefs.length) {
      resolve(resolvedMap);
      return;
    }
    if (!wx.cloud) {
      reject({ detail: "当前基础库不支持云存储" });
      return;
    }
    wx.cloud.getTempFileURL({
      fileList: cloudRefs,
      success(res) {
        ((res && res.fileList) || []).forEach((item) => {
          if (item && item.fileID) {
            resolvedMap[item.fileID] = item.tempFileURL || "";
          }
        });
        resolve(resolvedMap);
      },
      fail(error) {
        reject(error || { detail: "云文件链接获取失败" });
      }
    });
  });
}

module.exports = {
  uploadImageToCloud,
  getTempFileURL,
  resolveFileRefs,
  isCloudFileId,
  cloudEnv: config.cloudEnv
};
