import * as THREE from 'three'

export function makeAtmosphere(scene: THREE.Scene): { sky: THREE.Mesh; clouds: THREE.Mesh } {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uNight: { value: 0 },
      uCollapse: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uNight;
      uniform float uCollapse;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 duskZ = vec3(0.08, 0.07, 0.22);
        vec3 duskH = vec3(0.92, 0.42, 0.22);
        vec3 nightZ = vec3(0.01, 0.02, 0.06);
        vec3 nightH = vec3(0.12, 0.08, 0.18);
        vec3 fireH = vec3(0.9, 0.25, 0.08);
        vec3 zen = mix(duskZ, nightZ, uNight);
        vec3 hor = mix(duskH, nightH, uNight);
        hor = mix(hor, fireH, uCollapse * 0.7);
        vec3 col = mix(hor, zen, pow(h, 1.15));
        float sun = pow(max(0.0, dot(normalize(vDir), normalize(vec3(-0.55, 0.12, 0.3)))), 48.0);
        col += vec3(1.0, 0.7, 0.35) * sun * (1.0 - uNight * 0.75);
        float star = step(0.997, fract(sin(dot(vDir.xy, vec2(12.9898, 78.233))) * 43758.5453));
        col += vec3(0.8, 0.85, 1.0) * star * uNight;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), skyMat)
  scene.add(sky)

  const cloudMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uCollapse: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uNight;
      uniform float uCollapse;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i); float b = hash(i+vec2(1.0,0.0));
        float c = hash(i+vec2(0.0,1.0)); float d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        vec2 p = (vUv - 0.5) * 8.0;
        float n = fbm(p + vec2(uTime * 0.015, uTime * 0.008));
        float ring = smoothstep(0.82, 0.2, length(vUv-0.5));
        vec3 col = mix(vec3(0.95,0.72,0.62), vec3(0.55,0.42,0.7), uNight);
        col = mix(col, vec3(0.35,0.12,0.08), uCollapse);
        float a = smoothstep(0.38, 0.72, n) * ring * 0.92;
        gl_FragColor = vec4(col, a);
      }
    `,
  })
  const clouds = new THREE.Mesh(new THREE.CircleGeometry(780, 48), cloudMat)
  clouds.rotation.x = -Math.PI * 0.5
  clouds.position.y = -70
  scene.add(clouds)
  return { sky, clouds }
}
