/* Barber pole rendered in one fragment shader: a lit glass cylinder with helical stripes and chrome caps.
   The stripes turn with scroll progress (setProgress) plus a slow idle spin. */
(function (root) {
  function createPole(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return null;
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `
      precision highp float;
      varying vec2 uv;
      uniform vec2 res; uniform float t; uniform float spin;
      const vec3 INK = vec3(0.047, 0.043, 0.039);
      const vec3 BONE = vec3(0.933, 0.941, 0.949);
      const vec3 CORAL = vec3(0.898, 0.196, 0.176);
      const vec3 LIME = vec3(0.302, 0.486, 1.0);
      float sat(float x){ return clamp(x, 0.0, 1.0); }
      vec3 chrome(float x, float y){
        // brushed-metal banding that reads as a polished cap
        float b = 0.55 + 0.45 * cos(x * 3.14159) ; float band = 0.5 + 0.5 * sin(y * 40.0 + x * 2.0);
        return mix(vec3(0.18), vec3(0.92), b) * (0.85 + 0.15 * band);
      }
      void main(){
        vec2 px = uv * res; float aspect = res.x / res.y;
        vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);   // centred, height = 1
        float R = 0.16;                                       // tube radius
        float tubeTop = 0.36, tubeBot = -0.36;
        vec4 col = vec4(0.0);
        float ax = q.x / R;                                    // -1..1 across the tube
        if (abs(ax) < 1.0) {
          float nz = sqrt(1.0 - ax * ax);                      // surface normal z
          vec3 n = normalize(vec3(ax, 0.0, nz));
          vec3 L = normalize(vec3(-0.5, 0.35, 0.8));
          float diff = 0.35 + 0.65 * sat(dot(n, L));
          float spec = pow(sat(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0))), 28.0);
          if (q.y < tubeTop && q.y > tubeBot) {
            float theta = asin(ax);                            // angle around the tube
            float s = fract((theta / 6.28318) * 1.0 + q.y * 1.35 + spin + t * 0.05);
            vec3 stripe = s < 0.25 ? CORAL : (s < 0.5 ? BONE : (s < 0.75 ? LIME : BONE));
            float edge = smoothstep(0.0, 0.012, abs(fract(s * 4.0) - 0.0)) ; // soften banding a touch
            vec3 base = stripe * diff * mix(0.92, 1.0, edge);
            // glass sleeve: fresnel rim + a long vertical highlight
            float fres = pow(1.0 - nz, 2.5);
            base += vec3(0.9) * spec * 0.8 + vec3(0.6, 0.72, 1.0) * fres * 0.3;
            base += vec3(1.0) * smoothstep(0.06, 0.0, abs(ax + 0.45)) * 0.18;
            col = vec4(base, 1.0);
          }
          // chrome caps with a domed top
          float capH = 0.05;
          if ((q.y >= tubeTop && q.y < tubeTop + capH) || (q.y <= tubeBot && q.y > tubeBot - capH)) {
            col = vec4(chrome(ax, q.y) * diff + spec * 0.6, 1.0);
          }
        }
        // top dome and bottom finial (slightly wider rings)
        float ringR = R * 1.18;
        if (abs(q.x) < ringR && ((q.y >= tubeTop + 0.05 && q.y < tubeTop + 0.065) || (q.y <= tubeBot - 0.05 && q.y > tubeBot - 0.065))) {
          float a = q.x / ringR; col = vec4(chrome(a, q.y) * (0.5 + 0.5 * sqrt(1.0 - a * a)), 1.0);
        }
        vec2 dome = vec2(q.x / (R * 0.95), (q.y - (tubeTop + 0.065)) / 0.09);
        if (dome.y > 0.0 && length(dome) < 1.0) { float z = sqrt(1.0 - dot(dome, dome)); col = vec4(chrome(dome.x, q.y) * (0.45 + 0.55 * z) + pow(z, 18.0) * 0.5, 1.0); }
        vec2 fin = vec2(q.x / (R * 0.55), (q.y - (tubeBot - 0.065)) / 0.07);
        if (fin.y < 0.0 && length(fin) < 1.0) { float z = sqrt(1.0 - dot(fin, fin)); col = vec4(chrome(fin.x, q.y) * (0.45 + 0.55 * z), 1.0); }
        // soft blue glow behind the pole
        if (col.a == 0.0) { float g = exp(-pow(q.x / (R * 2.4), 2.0)) * smoothstep(0.5, 0.0, abs(q.y)) * 0.22; col = vec4(LIME * g, g); }
        gl_FragColor = col;
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'res'), uT = gl.getUniformLocation(prog, 't'), uSpin = gl.getUniformLocation(prog, 'spin');
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let progress = 0, shown = 0, visible = false, raf = 0;
    const start = performance.now();
    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      shown += (progress - shown) * 0.12;                 // ease towards scroll position
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h); gl.uniform1f(uT, (now - start) / 1000); gl.uniform1f(uSpin, shown * 3.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    raf = requestAnimationFrame(draw);
    const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '100px' });
    io.observe(canvas);
    return { setProgress(p) { progress = p; }, destroy() { cancelAnimationFrame(raf); io.disconnect(); } };
  }
  root.RBPole = { create: createPole };
})(window);
