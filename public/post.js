// 화면 후처리 — 장면을 밝기 범위가 넓은 버퍼에 그린 뒤, 밝은 곳의 빛 번짐(블룸)을 더하고 화면 색으로 바꾼다.
// 마지막 단계에서 선명하게 하기 · 색 보정 · 가장자리 어둡게 · 잔 알갱이를 한 번에 처리한다.
import * as THREE from './vendor/three.module.js';

// 밝기 누르기 곡선: 어두운 곳과 중간 밝기는 그대로 두고, 0.76 을 넘는 밝은 곳만 부드럽게 눌러 하얗게 날아가지 않게 한다
// (후처리를 쓰든 안 쓰든 같은 곡선. three.js 의 '사용자 정의' 자리에 끼워 넣음)
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', `vec3 CustomToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < 0.76 ) return color;
	float np = 1.0 - 0.0576 / ( peak - 0.52 );
	color *= np / peak;
	return mix( color, vec3( np ), 1.0 - 1.0 / ( 0.15 * ( peak - np ) + 1.0 ) );
}`);
export const TONE = THREE.CustomToneMapping;

const tri = new THREE.BufferGeometry();
tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
const VS = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const mat = (o) => new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, toneMapped: false, ...o });

// 13번 읽어 반으로 줄이기. PREFILTER 는 첫 단계: 기준보다 밝은 부분만 남긴다
const DOWN = `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThresh; uniform float uKnee;
varying vec2 vUv;
vec3 S( float x, float y ) { return texture2D( tSrc, vUv + uTexel * vec2( x, y ) ).rgb; }
void main() {
  vec3 e = S( 0.0, 0.0 );
  vec3 col = e * 0.125 + ( S( -2.0, 2.0 ) + S( 2.0, 2.0 ) + S( -2.0, -2.0 ) + S( 2.0, -2.0 ) ) * 0.03125
    + ( S( 0.0, 2.0 ) + S( -2.0, 0.0 ) + S( 2.0, 0.0 ) + S( 0.0, -2.0 ) ) * 0.0625
    + ( S( -1.0, 1.0 ) + S( 1.0, 1.0 ) + S( -1.0, -1.0 ) + S( 1.0, -1.0 ) ) * 0.125;
  #ifdef PREFILTER
    float br = max( col.r, max( col.g, col.b ) );
    float soft = clamp( br - uThresh + uKnee, 0.0, 2.0 * uKnee ); soft = soft * soft / ( 4.0 * uKnee + 1e-4 );
    col *= max( soft, br - uThresh ) / max( br, 1e-4 );
    col = min( col, vec3( 10.0 ) );
  #endif
  gl_FragColor = vec4( col, 1.0 );
}`;
// 부드럽게 두 배로 키워 위 단계에 더하기
const UP = `
uniform sampler2D tSrc; uniform vec2 uTexel;
varying vec2 vUv;
vec3 S( float x, float y ) { return texture2D( tSrc, vUv + uTexel * vec2( x, y ) ).rgb; }
void main() {
  vec3 col = ( S( -1.0, 1.0 ) + S( 1.0, 1.0 ) + S( -1.0, -1.0 ) + S( 1.0, -1.0 ) ) + ( S( 0.0, 1.0 ) + S( -1.0, 0.0 ) + S( 1.0, 0.0 ) + S( 0.0, -1.0 ) ) * 2.0 + S( 0.0, 0.0 ) * 4.0;
  gl_FragColor = vec4( col * 0.0625, 1.0 );
}`;
const FINAL = `
uniform sampler2D tMain; uniform sampler2D tBloom; uniform vec2 uTexel;
uniform float uBloom; uniform float uSharp; uniform float uSat; uniform float uCon; uniform float uVig; uniform float uGrain; uniform float uTime; uniform float uFlash;
uniform vec3 uGain; uniform vec3 uLift; uniform vec3 uSunView; uniform vec3 uGlare; uniform vec2 uProj;
varying vec2 vUv;
float hash( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }
float lum( vec3 v ) { return sqrt( dot( min( v, vec3( 4.0 ) ), vec3( 0.299, 0.587, 0.114 ) ) ); }
void main() {
  vec3 c = texture2D( tMain, vUv ).rgb;
  #ifdef FXAA
    { // 가벼운 FXAA: 다중 표본을 끈 뒤 계단진 모서리만 그 방향으로 이웃과 섞음 (모바일)
      vec3 nw = texture2D( tMain, vUv + vec2( -1.0, -1.0 ) * uTexel ).rgb, ne = texture2D( tMain, vUv + vec2( 1.0, -1.0 ) * uTexel ).rgb;
      vec3 sw = texture2D( tMain, vUv + vec2( -1.0, 1.0 ) * uTexel ).rgb, se = texture2D( tMain, vUv + vec2( 1.0, 1.0 ) * uTexel ).rgb;
      float lNW = lum( nw ), lNE = lum( ne ), lSW = lum( sw ), lSE = lum( se ), lM = lum( c );
      float lMin = min( lM, min( min( lNW, lNE ), min( lSW, lSE ) ) ), lMax = max( lM, max( max( lNW, lNE ), max( lSW, lSE ) ) );
      if ( lMax - lMin > max( 0.04, lMax * 0.12 ) ) {
        vec2 dir = vec2( -( ( lNW + lNE ) - ( lSW + lSE ) ), ( lNW + lSW ) - ( lNE + lSE ) );
        float red = max( ( lNW + lNE + lSW + lSE ) * 0.03125, 1.0 / 128.0 );
        dir = clamp( dir / ( min( abs( dir.x ), abs( dir.y ) ) + red ), -6.0, 6.0 ) * uTexel;
        vec3 a = 0.5 * ( texture2D( tMain, vUv - dir / 6.0 ).rgb + texture2D( tMain, vUv + dir / 6.0 ).rgb );
        vec3 b = a * 0.5 + 0.25 * ( texture2D( tMain, vUv - dir * 0.5 ).rgb + texture2D( tMain, vUv + dir * 0.5 ).rgb );
        float lB = lum( b );
        c = ( lB < lMin || lB > lMax ) ? a : b;
      }
    }
  #endif
  #ifdef SHARPEN
    vec3 n = texture2D( tMain, vUv + vec2( uTexel.x, 0.0 ) ).rgb + texture2D( tMain, vUv - vec2( uTexel.x, 0.0 ) ).rgb + texture2D( tMain, vUv + vec2( 0.0, uTexel.y ) ).rgb + texture2D( tMain, vUv - vec2( 0.0, uTexel.y ) ).rgb;
    vec3 d = c - n * 0.25;
    c = max( c + clamp( d, -0.25, 0.25 ) * uSharp, 0.0 );
  #endif
  #ifdef BLOOM
    c += texture2D( tBloom, vUv ).rgb * uBloom;
  #endif
  // 해 쪽을 바라보면 화면에 엷게 번지는 빛
  vec3 ray = normalize( vec3( ( vUv * 2.0 - 1.0 ) * uProj, -1.0 ) );
  float sg = max( dot( ray, uSunView ), 0.0 );
  c += uGlare * ( pow( sg, 10.0 ) * 0.45 + pow( sg, 80.0 ) );
  gl_FragColor = vec4( c, 1.0 );
  #include <tonemapping_fragment>
  vec3 o = sRGBTransferOETF( vec4( clamp( gl_FragColor.rgb, 0.0, 1.0 ), 1.0 ) ).rgb;
  float l = dot( o, vec3( 0.299, 0.587, 0.114 ) );
  o = mix( vec3( l ), o, uSat );
  o = ( o - 0.5 ) * uCon + 0.5;
  o = o * uGain + uLift * ( 1.0 - o );
  vec2 q = ( vUv - 0.5 ) * vec2( 1.0, 0.86 );
  o *= mix( 1.0 - uVig, 1.0, smoothstep( 0.8, 0.28, length( q ) ) );
  o += ( hash( gl_FragCoord.xy + fract( uTime ) * 61.0 ) - 0.5 ) * uGrain;
  o = mix( o, vec3( 1.0 ), uFlash );
  gl_FragColor = vec4( clamp( o, 0.0, 1.0 ), 1.0 );
}`;

// 화면 공간 그늘(SSAO, 화질 '높음'): 세상만 그린 직후의 깊이로, 구석·물체 밑·벽이 만나는 곳을 어둡게 한다 (1인칭 무기는 뒤에 그려서 빠짐)
// 반 해상도에서 12번 표본 → 깊이를 보며 흐리기 → 원래 화면에 곱하기
const AO_FS = `
uniform sampler2D tDepth; uniform mat4 uProj; uniform mat4 uProjInv; uniform float uRadius;
varying vec2 vUv;
vec3 vpos( vec2 uv, float d ) { vec4 p = uProjInv * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 ); return p.xyz / p.w; }
void main() {
  float d = texture2D( tDepth, vUv ).r;
  if ( d >= 0.99999 ) { gl_FragColor = vec4( 1.0 ); return; }
  vec3 P = vpos( vUv, d );
  vec3 N = normalize( cross( dFdx( P ), dFdy( P ) ) );
  if ( dot( N, P ) > 0.0 ) N = -N;
  float fade = 1.0 - smoothstep( 32.0, 64.0, -P.z );
  if ( fade <= 0.0 ) { gl_FragColor = vec4( 1.0 ); return; }
  vec3 T = normalize( abs( N.y ) < 0.95 ? cross( N, vec3( 0.0, 1.0, 0.0 ) ) : cross( N, vec3( 1.0, 0.0, 0.0 ) ) ), B = cross( N, T );
  float a0 = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  float occ = 0.0;
  for ( int i = 0; i < 12; i ++ ) {
    float fi = float( i ), t = ( fi + 0.5 ) / 12.0, ang = a0 + fi * 2.399963, r = sqrt( t );
    vec3 dir = T * ( cos( ang ) * r ) + B * ( sin( ang ) * r ) + N * sqrt( max( 0.0, 1.0 - t ) );
    vec3 S = P + dir * uRadius * ( 0.25 + 0.75 * fract( t * 7.31 + a0 * 0.159 ) );
    vec4 sp = uProj * vec4( S, 1.0 ); vec2 su = sp.xy / sp.w * 0.5 + 0.5;
    if ( su.x < 0.0 || su.y < 0.0 || su.x > 1.0 || su.y > 1.0 ) continue;
    vec3 Q = vpos( su, texture2D( tDepth, su ).r );
    occ += step( 0.02 - P.z * 0.0015, Q.z - S.z ) * smoothstep( 0.0, 1.0, uRadius / max( abs( P.z - Q.z ), 1e-3 ) );
  }
  float ao = mix( 1.0, clamp( 1.0 - occ / 12.0 * 1.35, 0.0, 1.0 ), fade );
  gl_FragColor = vec4( ao, ao, ao, 1.0 );
}`;
const AOBLUR_FS = `
uniform sampler2D tAO; uniform sampler2D tDepth; uniform mat4 uProjInv; uniform vec2 uTexel;
varying vec2 vUv;
float lz( vec2 uv ) { vec4 p = uProjInv * vec4( uv * 2.0 - 1.0, texture2D( tDepth, uv ).r * 2.0 - 1.0, 1.0 ); return p.z / p.w; }
void main() {
  float z0 = lz( vUv ), sum = 0.0, ws = 0.0, tol = 0.035 * abs( z0 ) + 0.06;
  for ( int x = -2; x <= 1; x ++ ) for ( int y = -2; y <= 1; y ++ ) {
    vec2 o = ( vec2( float( x ), float( y ) ) + 0.5 ) * uTexel;
    float w = max( 0.0, 1.0 - abs( lz( vUv + o ) - z0 ) / tol );
    sum += texture2D( tAO, vUv + o ).r * w; ws += w;
  }
  float ao = ws > 0.001 ? sum / ws : 1.0;
  gl_FragColor = vec4( ao, ao, ao, 1.0 );
}`;
const AOMIX_FS = `
uniform sampler2D tAO; uniform float uStrength;
varying vec2 vUv;
void main() { float a = mix( 1.0, pow( texture2D( tAO, vUv ).r, 1.25 ), clamp( uStrength, 0.0, 1.0 ) ); gl_FragColor = vec4( a, a, a, 1.0 ); }`;

// 색 보정 기본값. 맵마다 덮어쓴다 (setGrade)
const GRADE0 = { bloom: 0.55, thresh: 1.0, knee: 0.35, sharp: 0.35, sat: 1.08, con: 1.06, vig: 0.22, grain: 0.012, gain: [1, 1, 1], lift: [0, 0, 0] };

export function makePost(renderer, opt = {}) {
  const gl = renderer.getContext(), caps = renderer.capabilities;
  // 밝기 범위가 넓은(반정밀도) 버퍼를 쓸 수 있는지
  const hdr = caps.isWebGL2 !== false && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const mesh = new THREE.Mesh(tri, null); mesh.frustumCulled = false;
  let samples = Math.min(opt.samples || 0, caps.maxSamples || 0), levels = opt.levels === undefined ? 5 : opt.levels;
  let main = null, chain = [], w = 0, h = 0, ok = true, aoOn = !!opt.ao && caps.isWebGL2 !== false, aoA = null, aoB = null;
  const mAo = mat({ fragmentShader: AO_FS, uniforms: { tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uRadius: { value: 0.95 } } });
  const mAoBlur = mat({ fragmentShader: AOBLUR_FS, uniforms: { tAO: { value: null }, tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() } } });
  const mAoMix = mat({ fragmentShader: AOMIX_FS, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, uniforms: { tAO: { value: null }, uStrength: { value: 0.9 } } });
  const mPre = mat({ fragmentShader: DOWN, defines: { PREFILTER: 1 }, uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThresh: { value: 1 }, uKnee: { value: 0.35 } } });
  const mDown = mat({ fragmentShader: DOWN, uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThresh: { value: 0 }, uKnee: { value: 0 } } });
  const mUp = mat({ fragmentShader: UP, blending: THREE.AdditiveBlending, transparent: true, uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } } });
  const mFinal = mat({ fragmentShader: FINAL, toneMapped: true, defines: { SHARPEN: 1, BLOOM: 1 }, uniforms: {
    tMain: { value: null }, tBloom: { value: null }, uTexel: { value: new THREE.Vector2() }, uBloom: { value: 0.5 }, uSharp: { value: 0.3 }, uSat: { value: 1 }, uCon: { value: 1 }, uVig: { value: 0.2 }, uGrain: { value: 0.01 }, uTime: { value: 0 }, uFlash: { value: 0 },
    uGain: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3(0, 0, 0) }, uSunView: { value: new THREE.Vector3(0, 0, 1) }, uGlare: { value: new THREE.Vector3(0, 0, 0) }, uProj: { value: new THREE.Vector2(1, 1) } } });
  const grade = { ...GRADE0 };

  function free() { if (main) { if (main.depthTexture) main.depthTexture.dispose(); main.dispose(); } for (const t of chain) t.dispose(); if (aoA) { aoA.dispose(); aoB.dispose(); } main = null; chain = []; aoA = aoB = null; }
  function alloc() {
    free();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    w = Math.max(2, size.x); h = Math.max(2, size.y);
    main = new THREE.WebGLRenderTarget(w, h, { type, samples, depthBuffer: true, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthTexture: aoOn ? new THREE.DepthTexture(w, h) : null });
    main.texture.generateMipmaps = false;
    if (aoOn) { // 그늘 계산용 반 해상도 버퍼 둘
      const o = { type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      aoA = new THREE.WebGLRenderTarget(Math.max(2, w >> 1), Math.max(2, h >> 1), o); aoB = new THREE.WebGLRenderTarget(Math.max(2, w >> 1), Math.max(2, h >> 1), o);
      aoA.texture.generateMipmaps = aoB.texture.generateMipmaps = false;
    }
    let cw = w, ch = h;
    for (let i = 0; i < levels; i++) {
      cw = Math.max(2, cw >> 1); ch = Math.max(2, ch >> 1);
      const t = new THREE.WebGLRenderTarget(cw, ch, { type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      t.texture.generateMipmaps = false; chain.push(t);
      if (cw <= 8 || ch <= 8) break;
    }
    mFinal.defines.BLOOM = chain.length ? 1 : 0; if (!chain.length) delete mFinal.defines.BLOOM;
    mFinal.needsUpdate = true;
  }
  function pass(material, target) { mesh.material = material; renderer.setRenderTarget(target); renderer.render(mesh, cam); }

  const fxaa = () => { const on = samples === 0; if (on === !!mFinal.defines.FXAA) return; if (on) mFinal.defines.FXAA = 1; else delete mFinal.defines.FXAA; mFinal.needsUpdate = true; }; // 다중 표본이 없으면 FXAA
  fxaa();
  const api = {
    active: true, hdr,
    get samples() { return samples; }, get levels() { return levels; },
    // 화질 단계 바꾸기 (계단 현상 줄이기 표본 수, 빛 번짐 단계 수)
    config(o) { if (o.samples !== undefined) { samples = Math.min(o.samples, caps.maxSamples || 0); fxaa(); } if (o.levels !== undefined) levels = o.levels; if (o.sharp !== undefined) { if (o.sharp) mFinal.defines.SHARPEN = 1; else delete mFinal.defines.SHARPEN; mFinal.needsUpdate = true; } main = null; },
    setGrade(g) { Object.assign(grade, GRADE0, g || {}); },
    // 해 쪽 빛 번짐: 시점 기준 해 방향, 빛 색(세기 포함), 시야각. 색이 0 이면 꺼짐
    setGlare(dir, r, g, b, tanX, tanY) { const u = mFinal.uniforms; if (dir) u.uSunView.value.copy(dir); u.uGlare.value.set(r, g, b); u.uProj.value.set(tanX || 1, tanY || 1); },
    grade,
    resize() { main = null; },
    get ao() { return aoOn; },
    setAo(on) { on = !!on && caps.isWebGL2 !== false; if (on !== aoOn) { aoOn = on; main = null; } },
    // 세상을 다 그린 직후(1인칭 무기를 그리기 전)에 불러 구석 그늘을 화면에 곱함
    occlude(camera) {
      if (!aoOn || !main || !main.depthTexture || !aoA) return;
      const tgt = renderer.getRenderTarget();
      mAo.uniforms.tDepth.value = main.depthTexture; mAo.uniforms.uProj.value.copy(camera.projectionMatrix); mAo.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
      pass(mAo, aoA);
      const bu = mAoBlur.uniforms; bu.tAO.value = aoA.texture; bu.tDepth.value = main.depthTexture; bu.uProjInv.value.copy(camera.projectionMatrixInverse); bu.uTexel.value.set(1 / aoA.width, 1 / aoA.height);
      pass(mAoBlur, aoB);
      mAoMix.uniforms.tAO.value = aoB.texture; mAoMix.uniforms.uStrength.value = grade.ao === undefined ? 1 : grade.ao;
      pass(mAoMix, main);
      renderer.setRenderTarget(tgt);
    },
    // 장면을 그릴 버퍼로 바꿈. 이 뒤에 평소처럼 renderer.render(...) 를 부르면 된다
    begin() {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (!main || size.x !== w || size.y !== h) alloc();
      renderer.setRenderTarget(main);
    },
    // 빛 번짐을 만들고 화면에 내보냄. flash = 화면 전체를 하얗게 덮는 정도 (섬광탄 같은 효과는 화면 요소로 따로 함)
    end(time = 0, flash = 0) {
      const n = chain.length;
      if (n) {
        mPre.uniforms.tSrc.value = main.texture; mPre.uniforms.uTexel.value.set(1 / w, 1 / h); mPre.uniforms.uThresh.value = hdr ? grade.thresh : Math.min(grade.thresh, 0.82); mPre.uniforms.uKnee.value = grade.knee;
        pass(mPre, chain[0]);
        for (let i = 1; i < n; i++) { mDown.uniforms.tSrc.value = chain[i - 1].texture; mDown.uniforms.uTexel.value.set(1 / chain[i - 1].width, 1 / chain[i - 1].height); pass(mDown, chain[i]); }
        for (let i = n - 1; i > 0; i--) { mUp.uniforms.tSrc.value = chain[i].texture; mUp.uniforms.uTexel.value.set(1 / chain[i].width, 1 / chain[i].height); pass(mUp, chain[i - 1]); }
      }
      const u = mFinal.uniforms;
      u.tMain.value = main.texture; u.tBloom.value = n ? chain[0].texture : null; u.uTexel.value.set(1 / w, 1 / h);
      u.uBloom.value = grade.bloom / Math.max(1, n * 0.55); u.uSharp.value = grade.sharp; u.uSat.value = grade.sat; u.uCon.value = grade.con; u.uVig.value = grade.vig; u.uGrain.value = grade.grain; u.uTime.value = time; u.uFlash.value = flash;
      u.uGain.value.set(grade.gain[0], grade.gain[1], grade.gain[2]); u.uLift.value.set(grade.lift[0], grade.lift[1], grade.lift[2]);
      pass(mFinal, null);
    },
    dispose() { free(); },
  };
  // 버퍼를 실제로 만들 수 있는지 한 번 확인 (안 되면 후처리를 끈다)
  try {
    alloc(); renderer.setRenderTarget(main);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) ok = false;
    renderer.setRenderTarget(null);
  } catch (e) { ok = false; }
  if (!ok) { free(); api.active = false; }
  return api;
}
