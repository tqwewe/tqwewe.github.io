// Pop-out avatar for the home page.
//
// ariandsiri.glb is the avatar photo traced in Blender and extruded into a thin rounded
// cutout, textured with that same photo. Drawn over the flat circle and nudged toward the
// camera it breaks out of the frame, and it turns a few degrees toward the cursor.
//
// Hand-rolled WebGL rather than a library: the model is a single textured primitive with
// no animation, so a small glTF reader and one shader cost a few hundred lines against the
// ~600KB three.js would add.

const DEG = Math.PI / 180;
const FOV = 25 * DEG;       // gentle perspective; enough parallax to read as 3D
const CANVAS_SCALE = 1.75;  // canvas side relative to the avatar, leaving room to overhang
const TEXTURE_SIZE = 512;   // power of two, so minification can use mipmaps
const MAX_YAW = 12 * DEG;
const MAX_PITCH = 7 * DEG;
const EASE = 0.1;
const RESTING_POSE = { yaw: 9 * DEG, pitch: -4 * DEG }; // used when nothing may animate

// Framing. The silhouette only leaves the circle low down, where it reads as a sticker
// overlapping the avatar, so the cutout is pushed toward the camera and lifted until the
// head clears the top of the circle, and the circle then clips everything below CLIP_CUT.
// What is left is a head over the rim of the frame and a clean circle everywhere else.
const POP = 0.86;      // model units toward the camera: magnifies ~28%
const LIFT = 0.06;     // model units upward, enough for the hair to cross the rim
const CLIP_CUT = 0.25; // avatar widths above centre; above this the circle stops clipping

// Contact shadow: the same silhouette in black, nudged and smeared into a penumbra by
// redrawing it across a spiral of taps. It tracks the pose, which is what places the
// cutout in front of the fence rather than on top of it.
const SHADOW_ALPHA = 0.4;
const SHADOW_OFFSET = { x: 2, y: 7 }; // css px, down and slightly right
const SHADOW_SPREAD = 7;              // css px, penumbra radius
const SHADOW_TAPS = 14;

const COMPONENT_TYPE = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COMPONENT_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

const VERTEX_SHADER = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
uniform mat4 u_mvp;
uniform mat3 u_rotation;
varying vec3 v_normal;
varying vec2 v_uv;
void main() {
  v_normal = u_rotation * a_normal;
  v_uv = a_uv;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}`;

// The photo carries its own lighting, so the shading here is only strong enough to separate
// the extruded rim from the face of the cutout. u_escape lets the subject cross the top of
// the circle while its shadow, which falls on the fence, never does.
const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_centre;
uniform float u_radius;
uniform float u_cut;
uniform float u_escape;
uniform float u_shadow;
varying vec3 v_normal;
varying vec2 v_uv;
const vec3 LIGHT = vec3(-0.35, 0.55, 0.75);
void main() {
  float edge = 1.0 - smoothstep(u_radius - 1.0, u_radius + 1.0, distance(gl_FragCoord.xy, u_centre));
  float coverage = max(edge, u_escape * step(u_cut, gl_FragCoord.y));
  if (coverage <= 0.0) discard;
  if (u_shadow > 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, u_shadow * coverage);
    return;
  }
  vec3 normal = normalize(v_normal);
  if (!gl_FrontFacing) normal = -normal;
  float diffuse = max(dot(normal, normalize(LIGHT)), 0.0);
  // The extruded rim takes smeared UVs, so darkening the faces turned away from the viewer
  // is what makes it read as a cut edge rather than a stretch of the photo.
  float rim = 0.55 + 0.45 * pow(abs(normal.z), 0.6);
  gl_FragColor = vec4(texture2D(u_texture, v_uv).rgb * (0.82 + 0.30 * diffuse) * rim, coverage);
}`;

function parseGlb(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, length)));
    else if (type === 0x004e4942) bin = new Uint8Array(buffer, offset + 8, length);
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error('glb is missing a chunk');
  return { json, bin };
}

// Blender writes every accessor tightly packed into its own buffer view, so the data can go
// to WebGL as a view straight onto the binary chunk.
function accessor(gltf, bin, index) {
  const acc = gltf.accessors[index];
  const view = gltf.bufferViews[acc.bufferView];
  const Ctor = COMPONENT_TYPE[acc.componentType];
  const start = bin.byteOffset + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  return new Ctor(bin.buffer, start, acc.count * COMPONENT_COUNT[acc.type]);
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function upload(gl, target, data) {
  const handle = gl.createBuffer();
  gl.bindBuffer(target, handle);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return handle;
}

async function loadTexture(gl, gltf, bin) {
  const image = gltf.images?.[0];
  if (image?.bufferView == null) throw new Error('model has no embedded texture');
  const view = gltf.bufferViews[image.bufferView];
  const bytes = new Uint8Array(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0), view.byteLength);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: image.mimeType }));

  // WebGL 1 only mipmaps powers of two, and Blender exports the texture at the photo's own
  // 902x903. The committed model is re-encoded to 512 already, but redrawing it here keeps
  // any other export mipmappable, which is what stops the minified texture shimmering as
  // the model turns. The cutout never draws much wider than 340 device pixels anyway.
  const scratch = document.createElement('canvas');
  scratch.width = TEXTURE_SIZE;
  scratch.height = TEXTURE_SIZE;
  const ctx = scratch.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  bitmap.close?.();

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

async function start(host, img, { json: gltf, bin }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
  if (!gl) return;

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const attributes = {
    position: gl.getAttribLocation(program, 'a_position'),
    normal: gl.getAttribLocation(program, 'a_normal'),
    uv: gl.getAttribLocation(program, 'a_uv'),
  };
  const uniforms = {
    mvp: gl.getUniformLocation(program, 'u_mvp'),
    rotation: gl.getUniformLocation(program, 'u_rotation'),
    texture: gl.getUniformLocation(program, 'u_texture'),
    centre: gl.getUniformLocation(program, 'u_centre'),
    radius: gl.getUniformLocation(program, 'u_radius'),
    cut: gl.getUniformLocation(program, 'u_cut'),
    escape: gl.getUniformLocation(program, 'u_escape'),
    shadow: gl.getUniformLocation(program, 'u_shadow'),
  };

  // The export is one node at the origin with no transform, and its coordinates are already
  // image-plane units: the unit square around the origin is the avatar photo. That is what
  // keeps the cutout registered with the circle underneath it.
  const parts = (gltf.meshes ?? []).flatMap((mesh) => mesh.primitives.map((primitive) => {
    const indices = accessor(gltf, bin, primitive.indices);
    return {
      position: upload(gl, gl.ARRAY_BUFFER, accessor(gltf, bin, primitive.attributes.POSITION)),
      normal: upload(gl, gl.ARRAY_BUFFER, accessor(gltf, bin, primitive.attributes.NORMAL)),
      uv: upload(gl, gl.ARRAY_BUFFER, accessor(gltf, bin, primitive.attributes.TEXCOORD_0)),
      indices: upload(gl, gl.ELEMENT_ARRAY_BUFFER, indices),
      count: indices.length,
      type: indices.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    };
  }));
  if (!parts.length) return;
  if (parts.some((part) => part.type === gl.UNSIGNED_INT) && !gl.getExtension('OES_element_index_uint')) return;

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1i(uniforms.texture, 0);

  const mvp = new Float32Array(16);
  const rotation = new Float32Array(9);
  const focal = 1 / Math.tan(FOV / 2);
  const near = 1;
  const far = 10;
  // Camera distance that makes one model unit cover exactly the avatar image: the height
  // visible at the model's plane is the canvas measured in avatar widths.
  const distance = CANVAS_SCALE / (2 * Math.tan(FOV / 2));
    // Penumbra taps on a golden-angle spiral, so the redraws cover the disc evenly.
  const taps = Array.from({ length: SHADOW_TAPS }, (_, i) => {
    const angle = i * 2.39996;
    const radius = SHADOW_SPREAD * Math.sqrt((i + 0.5) / SHADOW_TAPS);
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  const tapAlpha = 1 - (1 - SHADOW_ALPHA) ** (1 / SHADOW_TAPS);

  // Model units per css pixel at the cutout's depth, for nudging the shadow around.
  let unitsPerCss = 0;

  const resize = () => {
    const box = img.getBoundingClientRect().width;
    const side = Math.round(box * CANVAS_SCALE);
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
    canvas.width = Math.round(side * density);
    canvas.height = Math.round(side * density);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // The clip circle has to land exactly on the image's own rounded edge.
    gl.uniform2f(uniforms.centre, canvas.width / 2, canvas.height / 2);
    gl.uniform1f(uniforms.radius, (box / 2) * density);
    gl.uniform1f(uniforms.cut, canvas.height / 2 + CLIP_CUT * box * density);
    unitsPerCss = (distance - POP) / (distance * box);
  };

  const bind = (handle, location, size) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, handle);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };

  const drawParts = () => {
    for (const part of parts) {
      bind(part.position, attributes.position, 3);
      bind(part.normal, attributes.normal, 3);
      bind(part.uv, attributes.uv, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indices);
      gl.drawElements(gl.TRIANGLES, part.count, part.type, 0);
    }
  };

  // Builds the projected matrix for one pose, offset by (dx, dy) css pixels.
  const pose = (yaw, pitch, dx, dy) => {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);
    // Turn about Y, tilt about X, then lift and push the result toward the camera.
    const model = [
      cy, 0, -sy, 0,
      sy * sx, cx, cy * sx, 0,
      sy * cx, -sx, cy * cx, 0,
      dx * unitsPerCss, LIFT - dy * unitsPerCss, POP - distance, 1,
    ];
    // Projection folded in by hand: the canvas is square, so it only scales x and y by the
    // focal length and maps z into the depth range.
    for (let col = 0; col < 4; col++) {
      const [x, y, z, w] = model.slice(col * 4, col * 4 + 4);
      mvp[col * 4] = focal * x;
      mvp[col * 4 + 1] = focal * y;
      mvp[col * 4 + 2] = ((far + near) / (near - far)) * z + ((2 * far * near) / (near - far)) * w;
      mvp[col * 4 + 3] = -z;
    }
    rotation.set([model[0], model[1], model[2], model[4], model[5], model[6], model[8], model[9], model[10]]);
    gl.uniformMatrix4fv(uniforms.mvp, false, mvp);
    gl.uniformMatrix3fv(uniforms.rotation, false, rotation);
  };

  const draw = (yaw, pitch) => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Shadow first, on the fence and never past the rim, the taps accumulating into a
    // penumbra. No depth, so the taps stack instead of fighting each other.
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.uniform1f(uniforms.escape, 0);
    gl.uniform1f(uniforms.shadow, tapAlpha);
    for (const [tx, ty] of taps) {
      pose(yaw, pitch, SHADOW_OFFSET.x + tx, SHADOW_OFFSET.y + ty);
      drawParts();
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.uniform1f(uniforms.escape, 1);
    gl.uniform1f(uniforms.shadow, 0);
    pose(yaw, pitch, 0, 0);
    drawParts();
  };

  let yaw = 0;
  let pitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let pointer = null;
  let frame = 0;

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  // Eases toward the target and then stops, so an idle page costs nothing.
  function tick() {
    frame = 0;
    yaw += (targetYaw - yaw) * EASE;
    pitch += (targetPitch - pitch) * EASE;
    draw(yaw, pitch);
    if (Math.abs(targetYaw - yaw) > 1e-4 || Math.abs(targetPitch - pitch) > 1e-4) schedule();
  }

  const aim = () => {
    if (!pointer) return;
    const box = host.getBoundingClientRect();
    const dx = (pointer.x - (box.left + box.width / 2)) / (window.innerWidth / 2);
    const dy = (pointer.y - (box.top + box.height / 2)) / (window.innerHeight / 2);
    targetYaw = Math.max(-1, Math.min(1, dx)) * MAX_YAW;
    targetPitch = Math.max(-1, Math.min(1, dy)) * MAX_PITCH;
    schedule();
  };

  const settle = () => {
    pointer = null;
    targetYaw = 0;
    targetPitch = 0;
    schedule();
  };

  await loadTexture(gl, gltf, bin);
  resize();
  host.appendChild(canvas);
  // Settle the transparent state before the class below flips it, or the fade is skipped.
  getComputedStyle(canvas).opacity;

  const live = new AbortController();
  const { signal } = live;

  // Reaching here is the support test: the model parsed, the texture decoded and WebGL drew
  // it. Only now is it safe to drop the subject from the image behind the cutout, and only
  // once the cutout is opaque, since it is what covers the swap.
  if (host.dataset.avatarPlate) {
    const photo = img.src;
    const plate = new Image();
    plate.src = host.dataset.avatarPlate;
    const faded = new Promise((resolve) => {
      canvas.addEventListener('transitionend', resolve, { once: true });
      setTimeout(resolve, 800); // in case the fade never runs
    });
    Promise.all([plate.decode(), faded])
      .then(() => { img.src = plate.src; })
      .catch(() => {}); // a plate that will not load just leaves the photo in place
    signal.addEventListener('abort', () => { img.src = photo; });
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Nothing may animate, but a fixed pose still shows the cutout standing off the photo.
    yaw = RESTING_POSE.yaw;
    pitch = RESTING_POSE.pitch;
    draw(yaw, pitch);
  } else {
    draw(yaw, pitch);
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    }, { passive: true, signal });
    // Scrolling moves the avatar out from under a cursor that never moved.
    window.addEventListener('scroll', aim, { passive: true, signal });
    window.addEventListener('blur', settle, { signal });
    document.addEventListener('mouseleave', settle, { signal });
  }

  window.addEventListener('resize', () => {
    resize();
    draw(yaw, pitch);
  }, { signal });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (frame) cancelAnimationFrame(frame);
    live.abort();
    host.classList.remove('is-3d');
    canvas.remove();
  });

  // The cutout now fills the circle itself, so the image below it hands over its shadow too.
  host.classList.add('is-3d');
  canvas.classList.add('is-ready');
}

const host = document.querySelector('[data-avatar-model]');
const img = host?.querySelector('img');
// The whole effect answers a cursor, so on a touch device it would only cost the download.
const wanted = host && img
  && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  && !navigator.connection?.saveData;

if (wanted) {
  // The flat photo is the fallback: if any of this fails the page keeps the avatar it has.
  fetch(host.dataset.avatarModel)
    .then((response) => {
      if (!response.ok) throw new Error(`avatar model ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => start(host, img, parseGlb(data)))
    .catch((err) => console.warn('avatar model failed to load', err));
}
