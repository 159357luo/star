// ==========  v16 - 横屏防抖 + 删除修复 ==========
var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");
var overlay = document.getElementById("overlay");
var modalCanvas = document.getElementById("modalCanvas");
var modalCtx = modalCanvas.getContext("2d");
var photoTitle = document.getElementById("photoTitle");
var photoDesc = document.getElementById("photoDesc");
var closeBtn = document.getElementById("closeBtn");
var prevBtn = document.getElementById("prevBtn");
var nextBtn = document.getElementById("nextBtn");
var deleteBtn = document.getElementById("deleteBtn");
var replaceBtn = document.getElementById("replaceBtn");
var replaceInput = document.getElementById("replace-input");
var uploadInput = document.getElementById("upload-input");
var speedSlider = document.getElementById("speed-slider");
var speedValEl = document.getElementById("speed-val");
var starNumSlider = document.getElementById("star-num-slider");
var starNumVal = document.getElementById("star-num-val");
var btnAutoRotate = document.getElementById("btn-auto-rotate");
var btnReset = document.getElementById("btn-reset");
var zoomIndicator = document.getElementById("zoom-indicator");
var starCountEl = document.getElementById("star-count");
var searchInput = null;
var searchFlyTo = null; // {starIdx, starId} or null
var announceText = "";
var announceTimer = 0;

var W, H;
var isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
var isLandscape = false;
var dpr = Math.min(window.devicePixelRatio || 1, 2); // 最高2x，兼顾性能

function detectOrientation() {
  isLandscape = window.innerWidth > window.innerHeight;
}

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 重建粒子位置
  for (var i = 0; i < particles.length; i++) {
    particles[i].x = Math.random() * W;
    particles[i].y = Math.random() * H;
  }
  detectOrientation();
  updateHintForMobile();
}
resize();
var resizeTimer = null;
window.addEventListener("resize", function() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});
window.addEventListener("orientationchange", function() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 400);
});

function updateHintForMobile() {
  var hintEl = document.getElementById("hint");
  if (!hintEl) return;
  if (isMobile && isLandscape) {
    hintEl.textContent = "滑动旋转 | 点击星星 | 双击查看照片 | 双指缩放";
  } else if (isMobile) {
    hintEl.textContent = "滑动旋转 | 点击星星 | 双击查看照片 | 双指缩放";
  } else {
    hintEl.textContent = "拖动旋转 | 点击星星 | 双击强化照片 | 点击标题直接修改 | 右上角按钮";
  }
}

// =====  =====
var TEMPLATE_COLORS = [
  {c1:"#667eea", c2:"#764ba2"},
  {c1:"#f093fb", c2:"#f5576c"},
  {c1:"#4facfe", c2:"#00f2fe"},
  {c1:"#43e97b", c2:"#38f9d7"},
  {c1:"#fa709a", c2:"#fee140"},
  {c1:"#a18cd1", c2:"#fbc2eb"},
  {c1:"#fccb90", c2:"#d57eeb"},
  {c1:"#e0c3fc", c2:"#8ec5fc"},
  {c1:"#f5576c", c2:"#ff6a88"},
  {c1:"#667eea", c2:"#00f2fe"},
  {c1:"#89f7fe", c2:"#66a6ff"},
  {c1:"#fddb92", c2:"#d1fdff"},
  {c1:"#c1dfc4", c2:"#deecdd"},
  {c1:"#9796f0", c2:"#fbc7d4"},
  {c1:"#fbc2eb", c2:"#a6c1ee"},
  {c1:"#fdcbf1", c2:"#fdcbd1"},
  {c1:"#a6c0fe", c2:"#f68084"},
  {c1:"#fccb90", c2:"#d57eeb"},
  {c1:"#e6dee9", c2:"#a6c1ee"},
  {c1:"#84fab0", c2:"#8fd3f4"},
  {c1:"#cfd9df", c2:"#e2ebf0"},
  {c1:"#f6d365", c2:"#fda085"},
  {c1:"#ffecd2", c2:"#fcb69f"},
  {c1:"#a1c4fd", c2:"#c2e9fb"},
  {c1:"#d4fc79", c2:"#96e6a1"},
  {c1:"#84fab0", c2:"#a8e6cf"},
  {c1:"#fbc2eb", c2:"#fcb69f"},
  {c1:"#a8edea", c2:"#fed6e3"},
  {c1:"#d299c2", c2:"#fef9d7"},
  {c1:"#64b3f4", c2:"#32d2c3"},
  {c1:"#ee9ca7", c2:"#ffdde1"},
  {c1:"#2193b0", c2:"#6dd5ed"},
];

function createCircleThumb(colorPair, size) {
  var c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  var cx = c.getContext("2d");
  var half = size / 2;
  var g = cx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, colorPair.c1);
  g.addColorStop(1, colorPair.c2);
  cx.fillStyle = g;
  cx.fillRect(0, 0, size, size);
  cx.globalCompositeOperation = "destination-in";
  cx.beginPath();
  cx.arc(half, half, half, 0, Math.PI * 2);
  cx.fill();
  return c;
}

var circleThumbs = [];
for (var ti = 0; ti < 32; ti++) {
  circleThumbs.push(createCircleThumb(TEMPLATE_COLORS[ti % 32], 256));
}

// =====  =====
var photos = [];
var loadedImages = [];
var photoStars = [];
var currentPhotoIdx = -1;
var STAR_CACHE = {};
var STAR_CACHE_SIZE = 512;

function getStarCache(idx) {
  if (!STAR_CACHE[idx]) {
    var c = document.createElement("canvas");
    c.width = STAR_CACHE_SIZE;
    c.height = STAR_CACHE_SIZE;
    var cctx = c.getContext("2d");
    var half = STAR_CACHE_SIZE / 2;
    cctx.beginPath();
    cctx.arc(half, half, half, 0, Math.PI * 2);
    cctx.clip();
    var realImg = loadedImages[idx];
    if (realImg) {
      var scale = Math.min(STAR_CACHE_SIZE / realImg.width, STAR_CACHE_SIZE / realImg.height);
      var dw = realImg.width * scale;
      var dh = realImg.height * scale;
      cctx.drawImage(realImg, (STAR_CACHE_SIZE - dw) / 2, (STAR_CACHE_SIZE - dh) / 2, dw, dh);
    } else {
      cctx.drawImage(circleThumbs[idx % 32], 0, 0, STAR_CACHE_SIZE, STAR_CACHE_SIZE);
    }
    STAR_CACHE[idx] = c;
  }
  return STAR_CACHE[idx];
}

// =====  =====
function initPhotos() {
  photos = [];
  loadedImages = [];
  photoStars = [];
  STAR_CACHE = {};
  for (var i = 0; i < 32; i++) {
    photos.push({ title: "\u661F\u661F " + (i + 1), desc: "", img: null });
    loadedImages[i] = null;
  }
  buildPhotoStars(photos.length);
  updateStarCount();
}

function buildPhotoStars(count) {
  photoStars = [];
  var numArms = 3;
  var maxRadius = 400 + count * 8;
  for (var i = 0; i < count; i++) {
    var t = i / Math.max(count - 1, 1);
    var angle = t * Math.PI * 8;
    var radius = Math.pow(t, 0.6) * maxRadius;
    var armIndex = i % numArms;
    var armOffset = (armIndex / numArms) * Math.PI * 2;
    var armSpread = (Math.random() - 0.5) * (0.5 + t * 1.5);
    var x = Math.cos(angle + armOffset + armSpread) * radius;
    var z = Math.sin(angle + armOffset + armSpread) * radius;
    // Gaussian-like vertical spread: thicker at center, thinner at edges
    var centerWeight = Math.exp(-t * 3);
    var ySpread = 80 * (0.3 + centerWeight * 0.7);
    var y = (Math.random() - 0.5) * ySpread;
    var starId = "⭐-" + String(Math.floor(Math.random() * 900) + 100);
    photoStars.push({
      x: x,
      y: y,
      z: z,
      photo: photos[i % photos.length],
      baseSize: 12 + Math.random() * 12,
      pulsePhase: Math.random() * Math.PI * 2,
      idx: i,
      starId: starId,
    });
  }
}


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

function updateStarCount() {
  if (starCountEl) starCountEl.textContent = photoStars.length + " \u9897\u661F\u661F";
}

// ===== ： =====
function handleImageFile(file, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var base64Data = ev.target.result;
    var img = new Image();
    img.onload = function() {
      callback(null, img, base64Data);
    };
    img.onerror = function() {
      callback("\u56FE\u7247\u52A0\u8F7D\u5931\u8D25", null, null);
    };
    img.src = base64Data;
  };
  reader.readAsDataURL(file);
}

// ===== （） =====
uploadInput.addEventListener("change", function(e) {
  var files = e.target.files;
  for (var i = 0; i < files.length; i++) {
    (function(file) {
      handleImageFile(file, function(err, img, base64Data) {
        var idx = photos.length;
        photos.push({
          title: "\u6211\u7684\u7167\u7247 " + (idx + 1),
          desc: "\u81EA\u5B9A\u4E49\u4E0A\u4F20\u7684\u7167\u7247",
          img: err ? null : img,
        });
        if (err) {
          loadedImages[idx] = null;
        } else {
          loadedImages[idx] = img;
          saveImageToDB(idx, base64Data);
        }
        buildPhotoStars(photos.length);
        updateStarCount();
        STAR_CACHE[idx] = null;
        getStarCache(idx);
        savePhotoData();
      });
    })(files[i]);
  }
  uploadInput.value = "";
});

// ===== （）=====
replaceBtn.addEventListener("click", function(e) {
  e.preventDefault();
  replaceInput.click();
});

replaceInput.addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file || currentPhotoIdx < 0) return;
  var idx = currentPhotoIdx;
  handleImageFile(file, function(err, img, base64Data) {
    if (err) {
      console.warn("\u56FE\u7247\u52A0\u8F7D\u5931\u8D25:", err);
      loadedImages[idx] = null;
    } else {
      loadedImages[idx] = img;
      photos[idx].img = img;
      saveImageToDB(idx, base64Data);
    }
    STAR_CACHE[idx] = null;
    getStarCache(idx);
    showPhoto(idx);
    savePhotoData();
  });
  replaceInput.value = "";
});

// ===== 深空背景星星（4000颗，多彩）=====
var deepStars = [];
var DEEP_STAR_COUNT = 4000;
for (var i = 0; i < DEEP_STAR_COUNT; i++) {
  var theta = Math.random() * Math.PI * 2;
  var phi = Math.acos(2 * Math.random() - 1);
  var layer = Math.random();
  var r;
  if (layer < 0.25) r = 600 + Math.random() * 1000;
  else if (layer < 0.6) r = 1600 + Math.random() * 2400;
  else if (layer < 0.85) r = 4000 + Math.random() * 4000;
  else r = 8000 + Math.random() * 12000;
  // 丰富星色：白/蓝白/暖金/淡紫/青绿
  var cr = Math.random();
  var starColor;
  if (cr < 0.55) starColor = "255,255,255";
  else if (cr < 0.72) starColor = "170,200,255";
  else if (cr < 0.84) starColor = "255,220,160";
  else if (cr < 0.93) starColor = "210,180,255";
  else starColor = "160,240,220";
  deepStars.push({
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
    baseSize: layer < 0.25 ? (Math.random() * 2.2 + 1.0) : (layer < 0.6 ? (Math.random() * 1.4 + 0.4) : (layer < 0.85 ? (Math.random() * 0.9 + 0.15) : (Math.random() * 0.6 + 0.08))),
    brightness: 0.35 + Math.random() * 0.65,
    twinkleSpeed: Math.random() * 0.018 + 0.002,
    twinkleOffset: Math.random() * Math.PI * 2,
    color: starColor,
  });
}

// =====  =====
var shootingStars = [];
function spawnShootingStar() {
  if (Math.random() > 0.004) return;
  shootingStars.push({
    x: Math.random() * W,
    y: Math.random() * H * 0.5,
    angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
    length: 100 + Math.random() * 80,
    speed: 5 + Math.random() * 4,
    life: 0,
    maxLife: 50 + Math.random() * 25,
  });
}

// ===== 飘浮星尘粒子（60颗，多彩微光）=====
var particles = [];
for (var i = 0; i < 60; i++) {
  var pc = Math.random();
  var pColor;
  if (pc < 0.5) pColor = "200,210,255";
  else if (pc < 0.75) pColor = "255,200,220";
  else if (pc < 0.9) pColor = "180,240,220";
  else pColor = "220,200,255";
  particles.push({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 1.8 + 0.4,
    opacity: Math.random() * 0.25 + 0.03,
    color: pColor,
  });
}

// ===== 3D =====
var rotX = 0, rotY = 0;
var targetRotX = 0, targetRotY = 0;
var FOV = 1000;
var zoomLevel = 1.0;
var mouseOverStar = -1;
var autoRotateOn = true;
var rotationSpeed = 0.2;
var targetRotationSpeed = 0.2;

function rotatePoint(px, py, pz, rx, ry) {
  var cosY = Math.cos(ry), sinY = Math.sin(ry);
  var nx = px * cosY - pz * sinY;
  var nz = px * sinY + pz * cosY;
  var cosX = Math.cos(rx), sinX = Math.sin(rx);
  var ny = py * cosX - nz * sinX;
  var nz2 = py * sinX + nz * cosX;
  return [nx, ny, nz2];
}

function project(px, py, pz) {
  var scale = FOV * zoomLevel / (FOV + pz * zoomLevel);
  return [px * scale + W / 2, py * scale + H / 2, scale];
}

// =====  =====
var dragging = false, lastMX = 0, lastMY = 0;

canvas.addEventListener("mousedown", function(e) {
  dragging = true;
  lastMX = e.clientX;
  lastMY = e.clientY;
});

window.addEventListener("mousemove", function(e) {
  if (!dragging) return;
  var dx = e.clientX - lastMX;
  var dy = e.clientY - lastMY;
  targetRotY += dx * 0.004;
  targetRotX += dy * 0.004;
  targetRotX = Math.max(-1.5, Math.min(1.5, targetRotX));
  lastMX = e.clientX;
  lastMY = e.clientY;
});

window.addEventListener("mouseup", function() { dragging = false; });

canvas.addEventListener("touchstart", function(e) {
  dragging = true;
  lastMX = e.touches[0].clientX;
  lastMY = e.touches[0].clientY;
}, {passive:false});

canvas.addEventListener("touchmove", function(e) {
  if (!dragging) return;
  e.preventDefault(); // 防止浏览器默认手势
  var dx = e.touches[0].clientX - lastMX;
  var dy = e.touches[0].clientY - lastMY;
  targetRotY += dx * 0.004;
  targetRotX += dy * 0.004;
  targetRotX = Math.max(-1.5, Math.min(1.5, targetRotX));
  lastMX = e.touches[0].clientX;
  lastMY = e.touches[0].clientY;
}, {passive:false});

canvas.addEventListener("touchend", function() { dragging = false; });

canvas.addEventListener("wheel", function(e) {
  e.preventDefault();
  var delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel = Math.max(0.3, Math.min(5.0, zoomLevel + delta));
  if (zoomIndicator) zoomIndicator.textContent = "\u7F29\u653E: " + zoomLevel.toFixed(1) + "x";
}, {passive:false});

// ===== \u634F\u5408\u7F29\u653E\uFF08\u79FB\u52A8\u7AEF\uFF09=====
var pinchDist = 0;
var pinchCenterX = 0, pinchCenterY = 0;

canvas.addEventListener("touchstart", function(e) {
  if (e.touches.length === 2) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchDist = Math.sqrt(dx * dx + dy * dy);
    pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    dragging = false;
  }
}, {passive:false});

canvas.addEventListener("touchmove", function(e) {
  if (e.touches.length === 2) {
    e.preventDefault();
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (pinchDist > 0) {
      var delta = (dist - pinchDist) * 0.008;
      zoomLevel = Math.max(0.3, Math.min(5.0, zoomLevel + delta));
      if (zoomIndicator) zoomIndicator.textContent = "\u7F29\u653E: " + zoomLevel.toFixed(1) + "x";
    }
    pinchDist = dist;
  }
}, {passive:false});

canvas.addEventListener("touchend", function(e) {
  if (e.touches.length < 2) pinchDist = 0;
});

// ===== \u53CC\u51FB\u68C0\u6D4B\uFF08\u79FB\u52A8\u7AEF\u6253\u5F00\u7167\u7247\uFF09=====
var lastTapTime = 0;
var lastTapX = 0, lastTapY = 0;
var DOUBLE_TAP_THRESHOLD = 300; // ms
var DOUBLE_TAP_DIST = 30; // px

canvas.addEventListener("touchend", function(e) {
  var now = Date.now();
  var tx = e.changedTouches[0].clientX;
  var ty = e.changedTouches[0].clientY;
  if (now - lastTapTime < DOUBLE_TAP_THRESHOLD &&
      Math.abs(tx - lastTapX) < DOUBLE_TAP_DIST &&
      Math.abs(ty - lastTapY) < DOUBLE_TAP_DIST) {
    // Double tap detected \u2014 find closest star
    var closest = null, closestDist = Infinity;
    for (var j = 0; j < photoStars.length; j++) {
      var ps = photoStars[j];
      var rp = rotatePoint(ps.x, ps.y, ps.z, rotX, rotY);
      var pr = project(rp[0], rp[1], rp[2]);
      if (pr[2] <= 0) continue;
      var ddx = tx - pr[0], ddy = ty - pr[1];
      var dist = Math.sqrt(ddx * ddx + ddy * ddy);
      var hitR = Math.max(ps.baseSize * 0.6, 25);
      if (dist < hitR && dist < closestDist) {
        closest = ps;
        closestDist = dist;
      }
    }
    if (closest) {
      var idx = photoStars.indexOf(closest);
      showPhoto(idx);
    }
    lastTapTime = 0;
  } else {
    lastTapTime = now;
    lastTapX = tx;
    lastTapY = ty;
  }
});

canvas.addEventListener("mousemove", function(e) {
  if (dragging) return;
  var mx = e.clientX, my = e.clientY;
  var found = -1;
  for (var j = 0; j < photoStars.length; j++) {
    var ps = photoStars[j];
    var rp = rotatePoint(ps.x, ps.y, ps.z, rotX, rotY);
    var pr = project(rp[0], rp[1], rp[2]);
    if (pr[2] <= 0) continue;
    var ddx = mx - pr[0], ddy = my - pr[1];
    var dist = Math.sqrt(ddx * ddx + ddy * ddy);
    var hitR = Math.max(ps.baseSize * 0.5, 18);
    if (dist < hitR) { found = j; break; }
  }
  mouseOverStar = found;
  canvas.style.cursor = found >= 0 ? "pointer" : "grab";
});

canvas.addEventListener("click", function(e) {
  if (Math.abs(e.clientX - lastMX) > 12 || Math.abs(e.clientY - lastMY) > 12) return;
  var mx = e.clientX, my = e.clientY;
  var closest = null, closestDist = Infinity;
  var isTouch = (e.pointerType === "touch") || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
  var minHitR = isTouch ? 28 : 16;
  for (var j = 0; j < photoStars.length; j++) {
    var ps = photoStars[j];
    var rp = rotatePoint(ps.x, ps.y, ps.z, rotX, rotY);
    var pr = project(rp[0], rp[1], rp[2]);
    if (pr[2] <= 0) continue;
    var ddx = mx - pr[0], ddy = my - pr[1];
    var dist = Math.sqrt(ddx * ddx + ddy * ddy);
    var hitR = Math.max(ps.baseSize * 0.5, minHitR);
    if (dist < hitR && dist < closestDist) {
      closest = ps;
      closestDist = dist;
    }
  }
  if (closest) {
    var idx = photoStars.indexOf(closest);
    showPhoto(idx);
  }
});

// =====  =====
btnAutoRotate.addEventListener("click", function() {
  autoRotateOn = !autoRotateOn;
  btnAutoRotate.textContent = "\u65CB\u8F6C：" + (autoRotateOn ? "\u5F00" : "\u5173");
  btnAutoRotate.classList.toggle("active", autoRotateOn);
});

btnReset.addEventListener("click", function() {
  targetRotX = 0;
  targetRotY = 0;
});

speedSlider.addEventListener("input", function() {
  targetRotationSpeed = this.value / 100;
  speedValEl.textContent = targetRotationSpeed.toFixed(1) + "x";
});

starNumSlider.addEventListener("input", function() {
  var num = parseInt(this.value);
  starNumVal.textContent = num;
  buildPhotoStars(num);
  updateStarCount();
  savePhotoData();
});

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
    if (data && data.photos && data.photos.length > 0) {
      // Rebuild photos array from saved data
      photos = [];
      loadedImages = [];
      photoStars = [];
      STAR_CACHE = {};
      for (var i = 0; i < data.photos.length; i++) {
        photos.push({ title: data.photos[i].title || ("星星 " + (i + 1)), desc: data.photos[i].desc || "", img: null });
        loadedImages[i] = null;
      }
      buildPhotoStars(data.count || photos.length);
      updateStarCount();
      if (data.count) {
        starNumSlider.value = data.count;
        starNumVal.textContent = data.count;
      }
      return true;
    }
    return false;
  } catch(e) {
    console.warn("Failed to load saved data:", e);
    return false;
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

// Initialize DB, load saved data first, create defaults only if nothing saved
openDB().then(function() {
  return loadSavedData().then(function(hasSavedData) {
    if (!hasSavedData) initPhotos();
    // Safety: ensure rotation speed matches slider after data restore
    targetRotationSpeed = parseInt(speedSlider.value) / 100;
    return loadSavedImages();
  });
}).catch(function(e) {
  console.warn("IndexedDB not available:", e);
  initPhotos();
});

// =====  =====
searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      var val = this.value.trim().toUpperCase();
      if (!val) {
        searchFlyTo = null;
        return;
      }
      searchFlyTo = null;
      for (var i = 0; i < photoStars.length; i++) {
        var sid = photoStars[i].starId || "";
        // Match against full starId OR just the number part
        if (sid.toUpperCase().indexOf(val) !== -1 || sid.replace(/[⭐-]/g, "").indexOf(val) !== -1) {
          searchFlyTo = { starIdx: i, starId: sid };
          break;
        }
      }
      if (searchFlyTo) {
        // Trigger shooting star burst
        for (var s = 0; s < 5; s++) {
          shootingStars.push({
            x: Math.random() * W,
            y: Math.random() * H * 0.5,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
            length: 120 + Math.random() * 100,
            speed: 6 + Math.random() * 5,
            life: 0,
            maxLife: 40 + Math.random() * 30,
          });
        }
        announceText = "\u627E\u5230\u5B83\u4E86！\u7F16\u53F7 " + searchFlyTo.starId;
        announceTimer = 200;
        autoRotateOn = false;
        var btn = document.getElementById("btn-auto-rotate");
        if (btn) {
          btn.textContent = "\u65CB\u8F6C：\u5173";
          btn.classList.remove("active");
        }
      } else {
        announceText = "\u672A\u627E\u5230\u7F16\u53F7\u542B " + val + " \u7684\u661F\u661F";
        announceTimer = 150;
      }
      this.blur();
    }
  });
}

// =====  =====
function showPhoto(idx) {
  currentPhotoIdx = idx;
  var ps = photoStars[idx];
  var photo = ps.photo;

  var mw = modalCanvas.width;
  var mh = modalCanvas.height;
  modalCtx.clearRect(0, 0, mw, mh);
  modalCtx.save();
  modalCtx.beginPath();
  modalCtx.rect(0, 0, mw, mh);
  modalCtx.clip();
  if (loadedImages[idx]) {
    var scale = Math.min(mw / loadedImages[idx].width, mh / loadedImages[idx].height);
    var dw = loadedImages[idx].width * scale;
    var dh = loadedImages[idx].height * scale;
    modalCtx.drawImage(loadedImages[idx], (mw - dw) / 2, (mh - dh) / 2, dw, dh);
  }
  modalCtx.restore();

  if (photo.title) photoTitle.textContent = photo.title;
  if (photo.desc) photoDesc.textContent = photo.desc;

  overlay.classList.add("show");
  var sb = document.querySelector(".search-box");
  if (sb) sb.classList.add("search-hidden");
}

function hidePhoto() {
  overlay.classList.remove("show");
  syncEdit();
  currentPhotoIdx = -1;
  var sb = document.querySelector(".search-box");
  if (sb) sb.classList.remove("search-hidden");
}

function syncEdit() {
  if (currentPhotoIdx >= 0 && currentPhotoIdx < photoStars.length) {
    photoStars[currentPhotoIdx].photo.title = photoTitle.textContent;
    photoStars[currentPhotoIdx].photo.desc = photoDesc.textContent;
    savePhotoData();
  }
}

closeBtn.addEventListener("click", hidePhoto);

// Reset search on Escape
window.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && searchFlyTo && searchFlyTo.reached) {
    searchFlyTo = null;
    autoRotateOn = true;
    var btn = document.getElementById("btn-auto-rotate");
    if (btn) {
      btn.textContent = "\u65CB\u8F6C：\u5F00";
      btn.classList.add("active");
    }
    targetRotX = 0;
    targetRotY = 0;
  }
});
overlay.addEventListener("click", function(e) {
  if (e.target === overlay) hidePhoto();
});

prevBtn.addEventListener("click", function(e) {
  e.stopPropagation();
  syncEdit();
  currentPhotoIdx = (currentPhotoIdx - 1 + photoStars.length) % photoStars.length;
  showPhoto(currentPhotoIdx);
});

nextBtn.addEventListener("click", function(e) {
  e.stopPropagation();
  syncEdit();
  currentPhotoIdx = (currentPhotoIdx + 1) % photoStars.length;
  showPhoto(currentPhotoIdx);
});

// ===== 删除照片 =====
deleteBtn.addEventListener("click", function(e) {
  e.stopPropagation();
  e.preventDefault();
  if (currentPhotoIdx < 0 || currentPhotoIdx >= photoStars.length) return;
  // 找到照片在photos数组中的实际索引
  var photoObj = photoStars[currentPhotoIdx].photo;
  var photoIdx = photos.indexOf(photoObj);
  if (photoIdx >= 0) {
    // 重置为默认照片
    photos[photoIdx].title = "星星 " + (photoIdx + 1);
    photos[photoIdx].desc = "";
    photos[photoIdx].img = null;
    loadedImages[photoIdx] = null;
    STAR_CACHE[photoIdx] = null;
    // 从IndexedDB删除图片
    deleteImageFromDB(photoIdx);
    savePhotoData();
    // 重建星星显示
    buildPhotoStars(photoStars.length);
    updateStarCount();
  }
  hidePhoto();
});

window.addEventListener("keydown", function(e) {
  if (!overlay.classList.contains("show")) return;
  if (e.key === "Escape") hidePhoto();
  if (e.key === "ArrowLeft") {
    syncEdit();
    currentPhotoIdx = (currentPhotoIdx - 1 + photoStars.length) % photoStars.length;
    showPhoto(currentPhotoIdx);
  }
  if (e.key === "ArrowRight") {
    syncEdit();
    currentPhotoIdx = (currentPhotoIdx + 1) % photoStars.length;
    showPhoto(currentPhotoIdx);
  }
});

// =====  =====
function drawDeepStars() {
  var t = Date.now();
  for (var i = 0; i < deepStars.length; i++) {
    var s = deepStars[i];
    var rp = rotatePoint(s.x, s.y, s.z, rotX, rotY);
    var pr = project(rp[0], rp[1], rp[2]);
    if (pr[2] <= 0) continue;
    var twinkle = s.brightness * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset));
    var sz = Math.min(s.baseSize * pr[2], 60);
    ctx.beginPath();
    ctx.arc(pr[0], pr[1], Math.max(sz, 0.3), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(" + s.color + "," + twinkle + ")";
    ctx.fill();
    if (sz > 1.5) {
      var g = ctx.createRadialGradient(pr[0], pr[1], 0, pr[0], pr[1], sz * 4);
      g.addColorStop(0, "rgba(" + s.color + "," + twinkle * 0.1 + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(pr[0], pr[1], sz * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }
}

function drawPhotoStars() {
  var t = Date.now();
  var sorted = [];
  for (var i = 0; i < photoStars.length; i++) {
    var ps = photoStars[i];
    var rp = rotatePoint(ps.x, ps.y, ps.z, rotX, rotY);
    var pr = project(rp[0], rp[1], rp[2]);
    if (pr[2] <= 0) continue;
    sorted.push({ps: ps, rp: rp, pr: pr, idx: i});
  }
  sorted.sort(function(a, b) { return b.rp[2] - a.rp[2]; });

  for (var i = 0; i < sorted.length; i++) {
    var ps = sorted[i].ps;
    var pr = sorted[i].pr;
    var sz = Math.min(ps.baseSize * pr[2], 60);
    var idx = sorted[i].idx;
    var pulse = 0.7 + 0.3 * Math.sin(t * 0.002 + ps.pulsePhase);

    if (idx === mouseOverStar) {
      pulse = 1;
      sz *= 1.15;
    }

    // 外层大光晕
    var glowOuter = ctx.createRadialGradient(pr[0], pr[1], sz * 0.8, pr[0], pr[1], sz * 4.5);
    glowOuter.addColorStop(0, "rgba(140,120,255," + 0.28 * pulse + ")");
    glowOuter.addColorStop(0.5, "rgba(80,60,200," + 0.12 * pulse + ")");
    glowOuter.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(pr[0], pr[1], sz * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = glowOuter;
    ctx.fill();

    // 内层光晕
    var g = ctx.createRadialGradient(pr[0], pr[1], 0, pr[0], pr[1], sz * 2.2);
    g.addColorStop(0, "rgba(160,140,255," + 0.4 * pulse + ")");
    g.addColorStop(0.5, "rgba(100,100,255," + 0.18 * pulse + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(pr[0], pr[1], sz * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Draw photo thumbnail as circle
    var cached = getStarCache(idx);
    if (cached) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pr[0], pr[1], sz * 1.2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(cached, pr[0] - sz * 1.2, pr[1] - sz * 1.2, sz * 2.4, sz * 2.4);
      ctx.restore();
    }

    if (idx === mouseOverStar) {
      // Glow ring
      ctx.beginPath();
      ctx.arc(pr[0], pr[1], sz * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(167,139,250,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Star ID label
      ctx.font = "bold " + Math.max(10, sz * 0.6) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(167,139,250,0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(ps.starId, pr[0], pr[1] - sz * 1.8);
      ctx.shadowBlur = 0;
    }

    // Pulsing ring around searched-found star
    if (searchFlyTo && searchFlyTo.reached && idx === searchFlyTo.starIdx) {
      var ringPulse = 0.5 + 0.5 * Math.sin(t * 0.005);
      var ringR = sz * (2.0 + ringPulse * 0.5);
      ctx.beginPath();
      ctx.arc(pr[0], pr[1], ringR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,200,100," + (0.6 + ringPulse * 0.4) + ")";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Second ring
      ctx.beginPath();
      ctx.arc(pr[0], pr[1], ringR * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,200,100," + (0.2 + ringPulse * 0.2) + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Label
      ctx.font = "bold " + Math.max(12, sz * 0.8) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,220,100,0.95)";
      ctx.shadowColor = "rgba(255,200,50,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(ps.starId, pr[0], pr[1] - ringR - 8);
      ctx.shadowBlur = 0;
    }
  }
}

function drawShootingStars() {
  shootingStars = shootingStars.filter(function(ss) {
    ss.x += Math.cos(ss.angle) * ss.speed;
    ss.y += Math.sin(ss.angle) * ss.speed;
    ss.life++;
    var alpha = 1 - ss.life / ss.maxLife;
    if (alpha <= 0) return false;
    var ex = ss.x - Math.cos(ss.angle) * ss.length;
    var ey = ss.y - Math.sin(ss.angle) * ss.length;
    // 光晕拖尾
    var glowGrad = ctx.createLinearGradient(ss.x, ss.y, ex, ey);
    glowGrad.addColorStop(0, "rgba(255,255,255," + alpha * 0.3 + ")");
    glowGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = glowGrad;
    ctx.lineWidth = 6;
    ctx.stroke();
    // 亮线核心
    var g = ctx.createLinearGradient(ss.x, ss.y, ex, ey);
    g.addColorStop(0, "rgba(255,255,255," + alpha + ")");
    g.addColorStop(0.3, "rgba(200,220,255," + alpha * 0.6 + ")");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    return true;
  });
}

function drawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(" + p.color + "," + p.opacity + ")";
    ctx.fill();
    // 小粒子发光
    if (p.size > 1.2) {
      var pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      pg.addColorStop(0, "rgba(" + p.color + "," + p.opacity * 0.4 + ")");
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();
    }
  }
}

// 星云偏移（缓慢动画）
var nebulaShiftX = 0, nebulaShiftY = 0;

function drawBackground() {
  var t = Date.now() * 0.00003;
  // 缓慢移动的星云中心
  nebulaShiftX = Math.sin(t * 0.7) * W * 0.08;
  nebulaShiftY = Math.cos(t * 0.6) * H * 0.06;

  // 基础深空背景
  var bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.85);
  bg.addColorStop(0, "#080e24");
  bg.addColorStop(0.4, "#040816");
  bg.addColorStop(0.75, "#020410");
  bg.addColorStop(1, "#000208");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 星云1 — 蓝紫（左上区域）
  var nx1 = W * 0.22 + nebulaShiftX;
  var ny1 = H * 0.3 + nebulaShiftY;
  var ng1 = ctx.createRadialGradient(nx1, ny1, 0, nx1, ny1, W * 0.5);
  ng1.addColorStop(0, "rgba(30,12,70,0.45)");
  ng1.addColorStop(0.4, "rgba(20,8,50,0.2)");
  ng1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ng1;
  ctx.fillRect(0, 0, W, H);

  // 星云2 — 青蓝（右上区域）
  var nx2 = W * 0.78 - nebulaShiftX * 0.7;
  var ny2 = H * 0.55 - nebulaShiftY * 0.5;
  var ng2 = ctx.createRadialGradient(nx2, ny2, 0, nx2, ny2, W * 0.45);
  ng2.addColorStop(0, "rgba(8,25,60,0.4)");
  ng2.addColorStop(0.5, "rgba(6,18,45,0.18)");
  ng2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ng2;
  ctx.fillRect(0, 0, W, H);

  // 星云3 — 暖紫（底部中央）
  var nx3 = W * 0.5 + nebulaShiftX * 0.5;
  var ny3 = H * 0.8 + nebulaShiftY * 0.3;
  var ng3 = ctx.createRadialGradient(nx3, ny3, 0, nx3, ny3, W * 0.4);
  ng3.addColorStop(0, "rgba(45,10,35,0.28)");
  ng3.addColorStop(0.6, "rgba(30,6,25,0.12)");
  ng3.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ng3;
  ctx.fillRect(0, 0, W, H);

  // 星云4 — 深蓝（中左）
  var nx4 = W * 0.35 + nebulaShiftX * 0.3;
  var ny4 = H * 0.6 - nebulaShiftY * 0.4;
  var ng4 = ctx.createRadialGradient(nx4, ny4, 0, nx4, ny4, W * 0.35);
  ng4.addColorStop(0, "rgba(5,15,45,0.3)");
  ng4.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ng4;
  ctx.fillRect(0, 0, W, H);

  // 暗角效果（vignette）
  var vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.55, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function animate() {
  drawBackground();

  rotX += (targetRotX - rotX) * 0.06;
  rotY += (targetRotY - rotY) * 0.06;

  // Safety: clamp targetRotationSpeed to slider range (0.0-1.0)
  if (targetRotationSpeed > 1.0) targetRotationSpeed = parseInt(speedSlider.value) / 100;
  rotationSpeed += (targetRotationSpeed - rotationSpeed) * 0.1;
  // Pause on hover
  var hoveredPhoto = mouseOverStar >= 0 && mouseOverStar < photoStars.length;
  if (autoRotateOn && !dragging && !hoveredPhoto) {
    targetRotY += 0.0015 * rotationSpeed * 10;
  }

  // Search fly-to: smoothly rotate to target star at ~45 degree
  if (searchFlyTo && searchFlyTo.starIdx >= 0 && searchFlyTo.starIdx < photoStars.length) {
    var ps = photoStars[searchFlyTo.starIdx];
    var idealRotY = -Math.atan2(ps.x, ps.z);
    // 45 degree: tilt X by -0.78 (PI/4) to see from above at angle
    var idealRotX = -1.3;
    var dy = idealRotY - targetRotY;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    targetRotY += dy * 0.04;
    var dx = idealRotX - targetRotX;
    targetRotX += dx * 0.04;
    targetRotX = Math.max(-1.5, Math.min(1.5, targetRotX));
    if (Math.abs(dy) < 0.003 && Math.abs(dx) < 0.003) {
      targetRotY = idealRotY;
      targetRotX = idealRotX;
      // Mark as reached so we can add a ring
      searchFlyTo.reached = true;
    }
  }

  drawParticles();
  drawDeepStars();
  drawPhotoStars();
  spawnShootingStar();
  drawShootingStars();

  // Draw announcement text
  if (announceTimer > 0) {
    announceTimer--;
    var alpha = Math.min(1, announceTimer / 30);
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(167,139,250," + alpha + ")";
    ctx.shadowColor = "rgba(167,139,250," + (alpha * 0.5) + ")";
    ctx.shadowBlur = 15;
    ctx.fillText(announceText, W / 2, H * 0.12);
    ctx.shadowBlur = 0;
  }

  requestAnimationFrame(animate);
}

animate();
