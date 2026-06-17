with open(r"D:\文档\强力球\星空相册\app.js", "r", encoding="utf-8") as f:
    content = f.read()

# ===== Modify handleImageFile to also save to IndexedDB =====
old_handle = """function handleImageFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      callback(null, img);
    };
    img.onerror = function() {
      callback("图片加载失败", null);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}"""

new_handle = """function handleImageFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var base64Data = ev.target.result;
    var img = new Image();
    img.onload = function() {
      callback(null, img);
    };
    img.onerror = function() {
      callback("图片加载失败", null);
    };
    img.src = base64Data;
  };
  reader.readAsDataURL(file);
}"""

if old_handle in content:
    content = content.replace(old_handle, new_handle)
    print("handleImageFile updated")
else:
    print("handleImageFile pattern not found (may not need change)")

# ===== Modify upload handler to save images to DB =====
old_upload = """        buildPhotoStars(photos.length);
        updateStarCount();
        STAR_CACHE[idx] = null;
        getStarCache(idx);"""

new_upload = """        buildPhotoStars(photos.length);
        updateStarCount();
        STAR_CACHE[idx] = null;
        getStarCache(idx);
        savePhotoData();"""

if old_upload in content:
    content = content.replace(old_upload, new_upload)
    print("Upload handler: savePhotoData added")
else:
    print("Upload handler pattern not found")

# ===== Modify replace handler to save images to DB =====
old_replace = """    STAR_CACHE[idx] = null;
    getStarCache(idx);
    showPhoto(idx);"""

new_replace = """    STAR_CACHE[idx] = null;
    getStarCache(idx);
    showPhoto(idx);
    savePhotoData();"""

if old_replace in content:
    content = content.replace(old_replace, new_replace)
    print("Replace handler: savePhotoData added")
else:
    print("Replace handler pattern not found")

with open(r"D:\文档\强力球\星空相册\app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Part 2 done")
