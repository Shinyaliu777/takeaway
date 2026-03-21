Page({
  data: {
    src: ""
  },
  onLoad(query) {
    this.setData({
      src: query && query.src ? decodeURIComponent(query.src) : ""
    });
  }
});
