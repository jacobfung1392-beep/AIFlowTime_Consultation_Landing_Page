(function(global) {
    'use strict';

    function deepClone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    var WORKSHOP0_ZERO_BG_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
body {
  position: relative;
}
#bg-zero-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  transform: translate3d(0, 0, 0);
  contain: strict;
}
#bg-zero-canvas {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.34;
  transform: translateZ(0);
}
</style>
</head>
<body>
<div id="bg-zero-wrap"><canvas id="bg-zero-canvas"></canvas></div>
<script>
(function() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.getElementById('bg-zero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var wrap = document.getElementById('bg-zero-wrap');
  var tiles = [];
  var time = 0;
  var viewport = { width: 0, height: 0, dpr: 1 };

  function getProfile(width, height) {
    var mobile = width < 768;
    if (mobile) {
      return {
        tileSize: 10,
        gap: 1.4,
        layerDepth: 15,
        jitterRange: 1,
        jitterSpeed: 0.0022,
        pulseSpeed: 0.0028,
        rotationX: -24,
        rotationY: 11,
        charWidth: Math.min(width * 0.62, 320),
        charHeight: Math.min(height * 0.84, 720)
      };
    }
    return {
      tileSize: 12,
      gap: 2,
      layerDepth: 20,
      jitterRange: 1.5,
      jitterSpeed: 0.002,
      pulseSpeed: 0.003,
      rotationX: -35,
      rotationY: 23,
      charWidth: 600,
      charHeight: 900
    };
  }

  function Tile(localX, localY, z, cx, cy, w, h, isBackLayer, profile) {
    this.localX = localX;
    this.localY = localY;
    this.originZ = z;
    this.cx = cx;
    this.cy = cy;
    this.w = w;
    this.h = h;
    this.isBackLayer = isBackLayer;
    this.profile = profile;
    this.baseAlpha = 0.16 + Math.random() * 0.32;
    this.pulseOffset = Math.random() * Math.PI * 2;
    this.jitterPhaseX = Math.random() * Math.PI * 2;
    this.jitterPhaseY = Math.random() * Math.PI * 2;
    this.screenX = 0;
    this.screenY = 0;
    this.depth = 0;
    this.currentAlpha = 1;
  }

  Tile.prototype.update = function() {
    var jx = Math.sin(time * this.profile.jitterSpeed + this.jitterPhaseX) * this.profile.jitterRange;
    var jy = Math.cos(time * this.profile.jitterSpeed + this.jitterPhaseY) * this.profile.jitterRange;
    var x = this.localX + jx;
    var y = this.localY + jy;
    var z = this.originZ;
    var radX = this.profile.rotationX * (Math.PI / 180);
    var radY = this.profile.rotationY * (Math.PI / 180);
    var y1 = y * Math.cos(radX) - z * Math.sin(radX);
    var z1 = y * Math.sin(radX) + z * Math.cos(radX);
    var x2 = x * Math.cos(radY) + z1 * Math.sin(radY);
    var z2 = -x * Math.sin(radY) + z1 * Math.cos(radY);
    this.screenX = x2 + this.cx;
    this.screenY = y1 + this.cy;
    this.depth = z2;
    var pulse = Math.sin(time * this.profile.pulseSpeed + this.pulseOffset);
    this.currentAlpha = Math.max(0, Math.min(1, this.baseAlpha + pulse * 0.08));
  };

  Tile.prototype.draw = function() {
    var front = { r: 224, g: 122, b: 95 };
    var back = { r: 120, g: 120, b: 130 };
    var c = this.isBackLayer ? back : front;
    var alpha = this.currentAlpha * (this.isBackLayer ? 0.56 : 1);
    ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
    ctx.fillRect(this.screenX, this.screenY, this.w, this.h);
    ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (this.isBackLayer ? 0.08 : 0.22) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.screenX, this.screenY, this.w, this.h);
  };

  function createTilesForCharacter(char, cx, cy, width, height, profile) {
    var buffer = document.createElement('canvas');
    buffer.width = width;
    buffer.height = height;
    var bctx = buffer.getContext('2d');
    bctx.fillStyle = '#000';
    bctx.font = '900 ' + Math.round(height * 0.82) + 'px "Arial Black", Arial, Helvetica, sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText(char, width / 2, height / 2);
    var data = bctx.getImageData(0, 0, width, height).data;
    for (var y = 0; y < height; y += profile.tileSize) {
      for (var x = 0; x < width; x += profile.tileSize) {
        var index = (y * width + x) * 4 + 3;
        if (data[index] > 50) {
          var localX = x - width / 2;
          var localY = y - height / 2;
          var tileW = profile.tileSize - profile.gap;
          var tileH = profile.tileSize - profile.gap;
          var jx = (Math.random() - 0.5) * (profile.tileSize * 0.35);
          var jy = (Math.random() - 0.5) * (profile.tileSize * 0.35);
          tiles.push(new Tile(localX + jx, localY + jy, profile.layerDepth / 2, cx, cy, tileW, tileH, false, profile));
          tiles.push(new Tile(localX + jx, localY + jy, -profile.layerDepth / 2, cx, cy, tileW, tileH, true, profile));
        }
      }
    }
  }

  function rebuildScene() {
    tiles = [];
    var profile = getProfile(viewport.width, viewport.height);
    createTilesForCharacter('0', viewport.width / 2, viewport.height / 2, profile.charWidth, profile.charHeight, profile);
  }

  function resize(force) {
    var width = Math.max(1, wrap ? wrap.clientWidth : window.innerWidth || document.documentElement.clientWidth || 1);
    var height = Math.max(1, wrap ? wrap.clientHeight : window.innerHeight || document.documentElement.clientHeight || 1);
    if (!force && width === viewport.width && height === viewport.height) return;
    viewport.width = width;
    viewport.height = height;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * viewport.dpr;
    canvas.height = height * viewport.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(viewport.dpr, viewport.dpr);
    rebuildScene();
  }

  function loop(timestamp) {
    time = timestamp;
    ctx.clearRect(0, 0, viewport.width + 1, viewport.height + 1);
    tiles.forEach(function(tile) { tile.update(); });
    tiles.sort(function(a, b) { return a.depth - b.depth; });
    tiles.forEach(function(tile) { tile.draw(); });
    requestAnimationFrame(loop);
  }

  resize(true);
  requestAnimationFrame(loop);

  var resizeTimer = null;
  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { resize(true); }, 120);
  }
  window.addEventListener('resize', scheduleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleResize);
  }
})();
<\/script>
</body>
</html>`;

    var LINKTREE_COSMIC_BG_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #071b42;
}
body {
  position: relative;
  font-family: Arial, sans-serif;
}
#cosmos {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.space-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(229,231,235,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(229,231,235,0.08) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.22;
  mix-blend-mode: screen;
}
</style>
</head>
<body>
<canvas id="cosmos"></canvas>
<div class="space-grid"></div>
<script>
(function() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.getElementById('cosmos');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stars = [];
  var shootingStars = [];
  var planets = [];
  var viewport = { width: 0, height: 0, dpr: 1 };
  var sun = { x: 0, y: 0 };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function buildStars() {
    stars = [];
    var total = viewport.width < 768 ? 180 : 340;
    for (var i = 0; i < total; i++) {
      stars.push({
        x: Math.random() * viewport.width,
        y: Math.random() * viewport.height,
        r: rand(0.4, viewport.width < 768 ? 1.6 : 1.2),
        a: rand(0.2, 0.95),
        tw: rand(0.001, 0.004),
        off: rand(0, Math.PI * 2)
      });
    }
  }

  function buildPlanets() {
    var base = Math.min(viewport.width, viewport.height);
    sun.x = viewport.width * 0.5;
    sun.y = viewport.height * 0.46;
    planets = [
      { orbit: base * 0.12, size: base * 0.026, color: '#a5a5a5', glow: 'rgba(255,255,255,0.16)', speed: 0.00055, angle: rand(0, Math.PI * 2) },
      { orbit: base * 0.18, size: base * 0.038, color: '#e6b8b8', glow: 'rgba(255,221,191,0.18)', speed: 0.00042, angle: rand(0, Math.PI * 2) },
      { orbit: base * 0.25, size: base * 0.04, color: '#4faebd', glow: 'rgba(79,174,189,0.2)', speed: 0.00033, angle: rand(0, Math.PI * 2) },
      { orbit: base * 0.32, size: base * 0.033, color: '#ff6b6b', glow: 'rgba(255,107,107,0.18)', speed: 0.00028, angle: rand(0, Math.PI * 2) },
      { orbit: base * 0.42, size: base * 0.055, color: '#f4d03f', glow: 'rgba(244,208,63,0.2)', speed: 0.00016, angle: rand(0, Math.PI * 2), ring: true },
      { orbit: base * 0.54, size: base * 0.048, color: '#5d3fd3', glow: 'rgba(93,63,211,0.18)', speed: 0.00011, angle: rand(0, Math.PI * 2) }
    ];
  }

  function resize() {
    viewport.width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    viewport.height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = viewport.width * viewport.dpr;
    canvas.height = viewport.height * viewport.dpr;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(viewport.dpr, viewport.dpr);
    buildStars();
    buildPlanets();
  }

  function drawBackdrop() {
    var bg = ctx.createLinearGradient(0, 0, 0, viewport.height);
    bg.addColorStop(0, '#071b42');
    bg.addColorStop(0.52, '#08204a');
    bg.addColorStop(1, '#040d21');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    var nebulaA = ctx.createRadialGradient(viewport.width * 0.25, viewport.height * 0.2, 0, viewport.width * 0.25, viewport.height * 0.2, viewport.width * 0.4);
    nebulaA.addColorStop(0, 'rgba(59,130,246,0.24)');
    nebulaA.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    var nebulaB = ctx.createRadialGradient(viewport.width * 0.72, viewport.height * 0.68, 0, viewport.width * 0.72, viewport.height * 0.68, viewport.width * 0.34);
    nebulaB.addColorStop(0, 'rgba(56,189,248,0.18)');
    nebulaB.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    var nebulaC = ctx.createRadialGradient(viewport.width * 0.5, viewport.height * 0.08, 0, viewport.width * 0.5, viewport.height * 0.08, viewport.width * 0.45);
    nebulaC.addColorStop(0, 'rgba(125,211,252,0.14)');
    nebulaC.addColorStop(1, 'rgba(125,211,252,0)');
    ctx.fillStyle = nebulaC;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  function drawStars(time) {
    stars.forEach(function(star) {
      var twinkle = (Math.sin(time * star.tw + star.off) + 1) / 2;
      ctx.globalAlpha = star.a * (0.35 + twinkle * 0.65);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawSun(time) {
    var glow = 1 + Math.sin(time * 0.0016) * 0.08;
    var radius = Math.min(viewport.width, viewport.height) * 0.055;
    var grad = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, radius * 5.6 * glow);
    grad.addColorStop(0, 'rgba(255,160,60,0.95)');
    grad.addColorStop(0.2, 'rgba(255,128,32,0.5)');
    grad.addColorStop(1, 'rgba(255,128,32,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, radius * 5.6 * glow, 0, Math.PI * 2);
    ctx.fill();

    var core = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, radius);
    core.addColorStop(0, '#fff5c4');
    core.addColorStop(0.5, '#ffb347');
    core.addColorStop(1, '#ff7b22');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOrbit(radius) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sun.x, sun.y, radius, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPlanet(planet, time) {
    var angle = planet.angle + time * planet.speed;
    var x = sun.x + Math.cos(angle) * planet.orbit;
    var y = sun.y + Math.sin(angle) * planet.orbit * 0.35;
    drawOrbit(planet.orbit);

    var glow = ctx.createRadialGradient(x, y, 0, x, y, planet.size * 3.2);
    glow.addColorStop(0, planet.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, planet.size * 3.2, 0, Math.PI * 2);
    ctx.fill();

    var fill = ctx.createRadialGradient(x - planet.size * 0.35, y - planet.size * 0.45, planet.size * 0.2, x, y, planet.size);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.18, planet.color);
    fill.addColorStop(1, 'rgba(5,10,20,0.9)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fill();

    if (planet.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.32);
      ctx.strokeStyle = 'rgba(255,235,160,0.75)';
      ctx.lineWidth = planet.size * 0.35;
      ctx.beginPath();
      ctx.ellipse(0, 0, planet.size * 1.8, planet.size * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function maybeSpawnShootingStar() {
    if (Math.random() > 0.016) return;
    shootingStars.push({
      x: rand(-viewport.width * 0.15, viewport.width * 0.6),
      y: rand(0, viewport.height * 0.28),
      vx: rand(10, 16),
      vy: rand(4, 7),
      life: rand(26, 42)
    });
  }

  function drawShootingStars() {
    for (var i = shootingStars.length - 1; i >= 0; i--) {
      var star = shootingStars[i];
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, star.life / 42) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - star.vx * 1.8, star.y - star.vy * 1.8);
      ctx.stroke();
      star.x += star.vx;
      star.y += star.vy;
      star.life -= 1;
      if (star.life <= 0 || star.x > viewport.width * 1.2 || star.y > viewport.height * 1.2) {
        shootingStars.splice(i, 1);
      }
    }
  }

  function loop(timestamp) {
    drawBackdrop();
    drawStars(timestamp);
    drawSun(timestamp);
    planets.forEach(function(planet) { drawPlanet(planet, timestamp); });
    maybeSpawnShootingStar();
    drawShootingStars();
    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
  window.addEventListener('resize', resize);
})();
<\/script>
</body>
</html>`;

    var BACKGROUND_ANIMATION_PRESETS = [
        {
            id: 'workshop0-zero',
            name: 'AI 起動班 Zero',
            badge: 'Workshop 0',
            description: '起動班目前使用的立體 0 字粒子背景，已修正手機版顯示。',
            previewHtml: '<div style="width:100%;height:100%;background:linear-gradient(160deg,#0f172a 0%,#1e293b 100%);position:relative;overflow:hidden;"><div style="position:absolute;inset:14% 28%;border:12px solid rgba(224,122,95,0.72);border-radius:999px;filter:drop-shadow(0 18px 24px rgba(0,0,0,0.3));"></div><div style="position:absolute;inset:28% 40%;border:8px solid rgba(255,255,255,0.16);border-radius:999px;"></div><div style="position:absolute;left:16%;top:20%;width:10px;height:10px;background:rgba(224,122,95,0.42);box-shadow:14px 26px 0 rgba(224,122,95,0.28),30px 10px 0 rgba(224,122,95,0.2),110px 38px 0 rgba(255,255,255,0.12),126px 18px 0 rgba(224,122,95,0.2),138px 64px 0 rgba(224,122,95,0.26);"></div></div>',
            code: WORKSHOP0_ZERO_BG_CODE
        },
        {
            id: 'linktree-cosmic',
            name: 'Linktree 宇宙星球',
            badge: 'Linktree',
            description: '把 Linktree 的深空、行星、星塵氛圍抽成可重用的背景動畫。',
            previewHtml: '<div style="width:100%;height:100%;background:radial-gradient(circle at 22% 18%, rgba(59,130,246,0.34), transparent 24%), radial-gradient(circle at 76% 22%, rgba(56,189,248,0.22), transparent 24%), radial-gradient(circle at 50% 45%, rgba(255,155,58,0.38), transparent 18%), linear-gradient(180deg,#071b42 0%,#08204a 58%,#040d21 100%);position:relative;overflow:hidden;"><div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px);background-size:22px 22px;opacity:0.28;"></div><div style="position:absolute;left:50%;top:46%;width:26px;height:26px;border-radius:50%;margin:-13px 0 0 -13px;background:radial-gradient(circle at 35% 35%, #fff7c2 0%, #ffb347 48%, #ff7b22 100%);box-shadow:0 0 28px rgba(255,140,46,0.48);"></div><div style="position:absolute;left:22%;top:30%;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #fff 0%, #4faebd 48%, #11243e 100%);"></div><div style="position:absolute;left:68%;top:22%;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #fff 0%, #f4d03f 48%, #473a0b 100%);box-shadow:0 0 18px rgba(244,208,63,0.22);"></div><div style="position:absolute;left:67%;top:22%;width:42px;height:14px;border-radius:50%;border:2px solid rgba(255,235,160,0.68);transform:translate(-9px,7px) rotate(-14deg);"></div><div style="position:absolute;left:62%;top:62%;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #fff 0%, #5d3fd3 48%, #140d31 100%);"></div></div>',
            code: LINKTREE_COSMIC_BG_CODE
        }
    ];

    function looksLikeLegacyWorkshop0Code(code) {
        var raw = String(code || '');
        return raw.indexOf("createTilesForCharacter('0'") !== -1 &&
            raw.indexOf('#bg-zero-canvas') !== -1 &&
            raw.indexOf('rotation: { x: -35, y: 23, z: 0 }') !== -1;
    }

    function normalizePageBackgroundEffectCode(code) {
        var raw = String(code || '');
        if (!raw.trim()) return raw;
        if (looksLikeLegacyWorkshop0Code(raw)) return WORKSHOP0_ZERO_BG_CODE;
        return raw;
    }

    function preparePageBackgroundEffectSrcdoc(code) {
        var raw = normalizePageBackgroundEffectCode(code);
        if (!String(raw || '').trim()) return raw;
        var viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" data-af-bg-viewport="1">';
        var baseReset = '<style data-af-bg-viewport-reset="1">html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;}body{position:relative;}canvas,svg,video,img{max-width:100%;}</style>';
        if (/<head[^>]*>/i.test(raw)) {
            if (!/name=["']viewport["']/i.test(raw)) raw = raw.replace(/<head([^>]*)>/i, '<head$1>' + viewportMeta);
            if (!/data-af-bg-viewport-reset/i.test(raw)) raw = raw.replace(/<head([^>]*)>/i, '<head$1>' + baseReset);
            return raw;
        }
        if (/<body[^>]*>/i.test(raw)) {
            if (/<html[^>]*>/i.test(raw)) return raw.replace(/<html([^>]*)>/i, '<html$1><head>' + viewportMeta + baseReset + '</head>');
            return raw.replace(/<body([^>]*)>/i, '<head>' + viewportMeta + baseReset + '</head><body$1>');
        }
        return '<!DOCTYPE html><html><head>' + viewportMeta + baseReset + '</head><body>' + raw + '</body></html>';
    }

    function getBackgroundAnimationPresetById(id) {
        var found = null;
        BACKGROUND_ANIMATION_PRESETS.forEach(function(preset) {
            if (preset.id === id) found = deepClone(preset);
        });
        return found;
    }

    function getAllPresets() {
        var builtIn = deepClone(BACKGROUND_ANIMATION_PRESETS);
        var custom = Array.isArray(global._bgAnimCustomPresets) ? deepClone(global._bgAnimCustomPresets) : [];
        return builtIn.concat(custom);
    }

    function addCustomPreset(preset) {
        if (!preset || !preset.id || !preset.code) return;
        if (!Array.isArray(global._bgAnimCustomPresets)) global._bgAnimCustomPresets = [];
        for (var i = 0; i < global._bgAnimCustomPresets.length; i++) {
            if (global._bgAnimCustomPresets[i].id === preset.id) {
                global._bgAnimCustomPresets[i] = deepClone(preset);
                _syncAllPresetsGlobal();
                return;
            }
        }
        global._bgAnimCustomPresets.push(deepClone(preset));
        _syncAllPresetsGlobal();
    }

    function removeCustomPreset(id) {
        if (!Array.isArray(global._bgAnimCustomPresets)) return;
        global._bgAnimCustomPresets = global._bgAnimCustomPresets.filter(function(p) { return p.id !== id; });
        _syncAllPresetsGlobal();
    }

    function isBuiltInPreset(id) {
        return BACKGROUND_ANIMATION_PRESETS.some(function(p) { return p.id === id; });
    }

    function _syncAllPresetsGlobal() {
        global.BACKGROUND_ANIMATION_PRESETS = getAllPresets();
    }

    global.WORKSHOP0_ZERO_BG_CODE = WORKSHOP0_ZERO_BG_CODE;
    global.LINKTREE_COSMIC_BG_CODE = LINKTREE_COSMIC_BG_CODE;
    global._bgAnimCustomPresets = [];
    global.BACKGROUND_ANIMATION_PRESETS = getAllPresets();
    global.getBackgroundAnimationPresetById = function(id) {
        var all = getAllPresets();
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === id) return deepClone(all[i]);
        }
        return null;
    };
    global.normalizePageBackgroundEffectCode = normalizePageBackgroundEffectCode;
    global.preparePageBackgroundEffectSrcdoc = preparePageBackgroundEffectSrcdoc;
    global.bgAnimAddCustomPreset = addCustomPreset;
    global.bgAnimRemoveCustomPreset = removeCustomPreset;
    global.bgAnimIsBuiltInPreset = isBuiltInPreset;
    global.bgAnimGetAllPresets = getAllPresets;
})(window);
