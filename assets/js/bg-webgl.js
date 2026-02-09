/* assets/js/bg-webgl.js
   Morphing blob/noise ripple background
*/
(() => {
  function init() {
    // Respect reduced motion
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Create canvas
    let canvas = document.getElementById("bg-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "bg-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(canvas);
    }

    // Style canvas as background layer
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "-1",
      pointerEvents: "none",
      display: "block",
    });

    let gl =
      canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      }) ||
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });

    if (!gl) {
      console.warn("[bg-webgl] WebGL not available.");
      return;
    }

    // --- Params --- //
    const SPEED = 0.1; 
    const TIME_WRAP = 100000.0; 

    const PHASE_KEY = "bg_phase_offset_v1";
    let phase = Number(localStorage.getItem(PHASE_KEY));
    if (!Number.isFinite(phase)) {
      phase = Math.random() * 1000.0;
      localStorage.setItem(PHASE_KEY, String(phase));
    }

    function absoluteTimeSeconds() {
      return ((Date.now() * 0.001) + phase) % TIME_WRAP;
    }

    const isWebGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      gl instanceof WebGL2RenderingContext;

    const vertGL2 = `#version 300 es
    precision highp float;
    const vec2 POS[3] = vec2[3](
      vec2(-1.0, -1.0),
      vec2( 3.0, -1.0),
      vec2(-1.0,  3.0)
    );
    out vec2 vUv;
    void main() {
      vec2 p = POS[gl_VertexID];
      vUv = 0.5 * (p + 1.0);
      gl_Position = vec4(p, 0.0, 1.0);
    }`;

    const fragGL2 = `#version 300 es
    precision highp float;
    out vec4 outColor;

    uniform vec2  uRes;
    uniform float uTime;
    uniform float uStrength; 

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 hash22(vec2 p) {
      float n = hash21(p);
      return vec2(n, hash21(p + n));
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f*f*(3.0 - 2.0*f);

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float f = 0.0;
      float a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) {
        f += a * vnoise(p);
        p = m * p;
        a *= 0.55;
      }
      return f;
    }

    float worley(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float dmin = 1e9;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y));
          vec2 o = hash22(i + g);
          o = 0.5 + 0.45 * sin(6.2831 * (o + uTime*0.07));
          vec2 r = g + o - f;
          float d = dot(r, r);
          dmin = min(dmin, d);
        }
      }
      return sqrt(dmin);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy / uRes.xy);
      vec2 p = (uv * 2.0 - 1.0);
      p.x *= uRes.x / uRes.y;

      float t = uTime;

      vec2 q = p;
      float n1 = fbm(q * 1.1 + vec2(0.0, t*0.05));
      float n2 = fbm(q * 1.2 + vec2(t*0.04, 0.0));
      vec2 warp = vec2(n1, n2) * 0.9;

      float c = worley(q * 2.0 + warp * 1.1);

      float bands = 0.5 + 0.5 * cos((c * 12.0 - t*0.7) * 3.14159);
      float edge = smoothstep(0.15, 0.55, bands) - smoothstep(0.55, 0.95, bands);
      edge = abs(edge);

      float ripple = sin((length(q + warp*0.4) * 8.0) - t*1.0) * 0.5 + 0.5;

      float v = (bands * 0.8 + ripple * 0.2);
      v = mix(v, 1.0 - c, 0.35);
      v = pow(v, 1.35);
      v *= (0.65 + 0.35 * (1.0 - edge));

      // Secondary color 
      float tcol = clamp(1.0 - edge, 0.0, 1.0);

      float hue = 0.55 + 0.08 * sin(uTime * 0.1) + 0.18 * tcol;

      vec3 a = vec3(0.40, 0.40, 0.42);
      vec3 b = vec3(0.28, 0.26, 0.24);
      vec3 cpal = vec3(1.00, 1.00, 1.00);
      vec3 d = vec3(0.00, 0.10, 0.20);

      vec3 pal = a + b * cos(6.28318 * (cpal * hue + d));

      vec3 base = vec3(0.06, 0.06, 0.0);
      vec3 col = mix(base, pal, 0.55);
      col *= (0.55 + 0.80 * tcol);

      float alpha = 0.40 * uStrength;
      outColor = vec4(col, alpha);
    }`;

    const vertGL1 = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = 0.5 * (aPos + 1.0);
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

    const fragGL1 = `
    precision highp float;
    varying vec2 vUv;

    uniform vec2  uRes;
    uniform float uTime;
    uniform float uStrength;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 hash22(vec2 p) {
      float n = hash21(p);
      return vec2(n, hash21(p + n));
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f*f*(3.0 - 2.0*f);

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float f = 0.0;
      float a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) {
        f += a * vnoise(p);
        p = m * p;
        a *= 0.55;
      }
      return f;
    }

    float worley(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float dmin = 1e9;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y));
          vec2 o = hash22(i + g);
          o = 0.5 + 0.45 * sin(6.2831 * (o + uTime*0.07));
          vec2 r = g + o - f;
          float d = dot(r, r);
          dmin = min(dmin, d);
        }
      }
      return sqrt(dmin);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      vec2 p = (uv * 2.0 - 1.0);
      p.x *= uRes.x / uRes.y;

      float t = uTime;

      vec2 q = p;
      float n1 = fbm(q * 1.1 + vec2(0.0, t*0.05));
      float n2 = fbm(q * 1.2 + vec2(t*0.04, 0.0));
      vec2 warp = vec2(n1, n2) * 0.9;

      float c = worley(q * 2.0 + warp * 1.1);

      float bands = 0.5 + 0.5 * cos((c * 12.0 - t*0.7) * 3.14159);
      float edge = smoothstep(0.15, 0.55, bands) - smoothstep(0.55, 0.95, bands);
      edge = abs(edge);

      float ripple = sin((length(q + warp*0.4) * 8.0) - t*1.0) * 0.5 + 0.5;

      float v = (bands * 0.8 + ripple * 0.2);
      v = mix(v, 1.0 - c, 0.35);
      v = pow(v, 1.35);
      v *= (0.65 + 0.35 * (1.0 - edge));

      vec3 col = vec3(v);
      col *= vec3(0.95, 0.98, 1.05);

      float alpha = 0.55 * uStrength;
      gl_FragColor = vec4(col, alpha);
    }`;

    function compileShader(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(info || "Shader compile failed");
      }
      return sh;
    }

    function createProgram(vsSrc, fsSrc) {
      const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
      const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        throw new Error(info || "Program link failed");
      }
      return prog;
    }

    let program;
    try {
      program = createProgram(isWebGL2 ? vertGL2 : vertGL1, isWebGL2 ? fragGL2 : fragGL1);
    } catch (e) {
      console.error("[bg-webgl] Shader error:", e);
      return;
    }

    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uStrength = gl.getUniformLocation(program, "uStrength");

    // Geometry setup
    let vao = null;
    if (isWebGL2) {
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindVertexArray(null);
    } else {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Resize
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize, { passive: true });

    // Main
    function frame() {
      resize();

      const t = prefersReduced ? 0.0 : (absoluteTimeSeconds() * SPEED);

      gl.uniform1f(uTime, t);
      gl.uniform1f(uStrength, 1.0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (isWebGL2) {
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      if (!prefersReduced) requestAnimationFrame(frame);
    }

    resize();
    requestAnimationFrame(frame);

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("[bg-webgl] WebGL context lost.");
    });
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
