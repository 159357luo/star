import json

with open(r"D:\文档\强力球\星空相册\app.js", "r", encoding="utf-8") as f:
    content = f.read()

# ===== ADD IndexedDB support at the top of the file =====

# Find the line after var starCountEl declaration and add DB code
db_code = '''
// ===== IndexedDB for persistent storage =====
var DB_NAME = "starryAlbum";
var DB_VERSION = 1;
var DB_STORE = "photos";
var db = null;

function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains(DB_STORE)) {
        d.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = function(e) {
      db = e.target.result;
      resolve(db);
    };
    req.onerror = function(e) {
      reject(e.target.error);
    };
  });
}

function dbPut(item) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(item);
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function(e) { reject(e.target.error); };
  });
}

function dbGet(id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(DB_STORE, "readonly");
    var req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = function() { resolve(req.result || null); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function dbDelete(id) {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function(e) { reject(e.target.error); };
  });
}

function dbClear() {
  return new Promise(function(resolve, reject) {
    var tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = function() { resolve(); };
    tx.onerror = function(e) { reject(e.target.error); };
  });
}

// Load saved data on startup
async function loadSavedData() {
  try {
    var data = await dbGet("album_data");
    if (data && data.photos) {
      // Restore photo titles and descriptions
      for (var i = 0; i < data.photos.length && i < photos.length; i++) {
        photos[i].title = data.photos[i].title || photos[i].title;
        photos[i].desc = data.photos[i].desc || photos[i].desc;
      }
    }
    if (data && data.count) {
      // Restore star count
      starNumSlider.value = data.count;
      starNumVal.textContent = data.count;
      targetRotationSpeed = data.count / 100;
    }
  } catch(e) {
    console.warn("Failed to load saved data:", e);
  }
}

// Save photo data (titles, descriptions, count)
function savePhotoData() {
  var saveData = {
    id: "album_data",
    photos: [],
    count: photoStars.length
  };
  for (var i = 0; i < photos.length; i++) {
    saveData.photos.push({
      title: photos[i].title,
      desc: photos[i].desc
    });
  }
  dbPut(saveData).catch(function(e) { console.warn("Save failed:", e); });
}

// Save image to IndexedDB as base64
async function saveImageToDB(idx, base64Data) {
  try {
    await dbPut({ id: "img_" + idx, data: base64Data });
  } catch(e) {
    console.warn("Image save failed:", e);
  }
}

// Load image from IndexedDB
async function loadImageFromDB(idx) {
  try {
    var item = await dbGet("img_" + idx);
    return item ? item.data : null;
  } catch(e) {
    return null;
  }
}

// Delete image from IndexedDB
async function deleteImageFromDB(idx) {
  try {
    await dbDelete("img_" + idx);
  } catch(e) {
    console.warn("Image delete failed:", e);
  }
}

// Clear all DB data
function clearAllData() {
  if (db) {
    dbClose();
    var req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = function() { location.reload(); };
  }
}

function dbClose() {
  if (db) { db.close(); db = null; }
}

// Initialize DB and load data
openDB().then(function() {
  loadSavedData();
}).catch(function(e) {
  console.warn("IndexedDB not available:", e);
});
'''

# Insert after the searchInput declaration block
insert_after = """  });
}

// ===== 弹窗 ====="""

insert_before = """  });
}

// ===== 弹窗 ====="""

if insert_before in content:
    content = content.replace(insert_before, db_code + "\n\n" + insert_after)
    print("IndexedDB code inserted")
else:
    print("ERROR: insertion point not found")

with open(r"D:\文档\强力球\星空相册\app.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Part 1 done")
