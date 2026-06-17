with open(r"D:\文档\强力球\星空相册\app.js", "r", encoding="utf-8") as f:
    content = f.read()

# ===== Load images from DB on startup =====
# Find initPhotos and modify it to load saved images
old_init = """initPhotos();"""

new_init = """// Load saved images from DB after init
loadSavedImages();"""

if old_init in content:
    content = content.replace(old_init, new_init)
    print("initPhotos replaced with loadSavedImages call")
else:
    print("initPhotos pattern not found")

# Add loadSavedImages function before initPhotos call
load_imgs_func = '''
async function loadSavedImages() {
  var promises = [];
  for (var i = 0; i < photos.length; i++) {
    promises.push((function(idx) {
      return loadImageFromDB(idx).then(function(base64) {
        if (base64) {
          return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() {
              loadedImages[idx] = img;
              STAR_CACHE[idx] = null;
              getStarCache(idx);
              resolve();
            };
            img.onerror = function() { resolve(); };
            img.src = base64;
          });
        }
        return Promise.resolve();
      });
    })(i));
  }
  await Promise.all(promises);
}
'''

# Insert before the initPhotos call
insert_point = """// Load saved images from DB after init
loadSavedImages();"""

if insert_point in content:
    content = content.replace(insert_point, load_imgs_func + "\n" + insert_point)
    print("loadSavedImages function added")
else:
    print("Insert point not found")

with open(r"D:\文档\强力球\星空相册\app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Part 3 done")
