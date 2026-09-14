import * as THREE from 'three'
import { DISTRICTS, GAME, type DistrictDef, type DistrictId } from './config'
import { CollisionWorld, box } from './collision'
import { hash2, mulberry32 } from './rng'

export type Landmark = {
  id: string
  district: DistrictId
  position: THREE.Vector3
  label: string
}

export type Elevator = {
  id: string
  mesh: THREE.Mesh
  x: number
  z: number
  stops: number[]
  stopIndex: number
  targetY: number
  y: number
  moving: boolean
  shaftMin: number
  shaftMax: number
}

export type Interactable = {
  id: string
  position: THREE.Vector3
  radius: number
  label: string
  kind: 'npc' | 'door' | 'use' | 'elevator' | 'child' | 'vendor' | 'anchor' | 'relic' | 'bell' | 'ferry'
}

export type Interior = {
  id: string
  doorIn: THREE.Vector3
  spawn: THREE.Vector3
  doorOut: THREE.Vector3
  outside: THREE.Vector3
  label: string
}

export type Airship = {
  group: THREE.Group
  dock: THREE.Vector3
  t: number
  phase: number
  fleeing: boolean
}

export type WorldData = {
  root: THREE.Group
  collision: CollisionWorld
  landmarks: Landmark[]
  elevators: Elevator[]
  interactables: Interactable[]
  interiors: Interior[]
  airships: Airship[]
  animated: { mesh: THREE.Object3D; spin: THREE.Vector3 }[]
  banners: THREE.Mesh[]
  beacons: THREE.Object3D[]
  debrisMeshes: THREE.Object3D[]
  districtGroups: Map<DistrictId, THREE.Group>
  sky: THREE.Mesh
  clouds: THREE.Mesh
  sun: THREE.DirectionalLight
  hemi: THREE.HemisphereLight
}

const R = GAME.cityRadius

export function buildWorld(scene: THREE.Scene): WorldData {
  const rng = mulberry32(0xa37e41a)
  const collision = new CollisionWorld()
  const root = new THREE.Group()
  root.name = 'aetheria'
  const landmarks: Landmark[] = []
  const elevators: Elevator[] = []
  const interactables: Interactable[] = []
  const interiors: Interior[] = []
  const airships: Airship[] = []
  const animated: { mesh: THREE.Object3D; spin: THREE.Vector3 }[] = []
  const banners: THREE.Mesh[] = []
  const beacons: THREE.Object3D[] = []
  const debrisMeshes: THREE.Object3D[] = []
  const districtGroups = new Map<DistrictId, THREE.Group>()

  const { sky, clouds } = makeAtmosphere(scene)
  const hemi = new THREE.HemisphereLight(0xffd8b8, 0x5a3a48, 1.35)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.15)
  sun.position.set(-80, 420, 160)
  sun.castShadow = false
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x8ab0ff, 0.75)
  fill.position.set(220, 180, -140)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0x887090, 0.95))
  for (const def of DISTRICTS) {
    const lamp = new THREE.PointLight(def.palette.light, 55, 120, 1.4)
    lamp.position.set(0, def.y + 18, 0)
    scene.add(lamp)
  }

  for (const def of DISTRICTS) {
    const g = new THREE.Group()
    g.name = def.id
    districtGroups.set(def.id, g)
    root.add(g)
    buildDistrict(g, def, rng, collision, landmarks, interactables, interiors, animated, banners, debrisMeshes)
  }

  placeElevators(root, collision, elevators, interactables)
  placeVerticalClimbs(root, collision, debrisMeshes)
  placeBridges(root, collision, debrisMeshes)
  placeAirships(root, airships, interactables)
  placeQuestFixtures(root, collision, interactables, interiors, landmarks)
  placeBeacons(root, interactables, beacons)

  scene.add(root)
  scene.fog = new THREE.Fog(0x4a3048, 280, 900)
  scene.background = new THREE.Color(0x24182c)

  return {
    root,
    collision,
    landmarks,
    elevators,
    interactables,
    interiors,
    airships,
    animated,
    banners,
    beacons,
    debrisMeshes,
    districtGroups,
    sky,
    clouds,
    sun,
    hemi,
  }
}

function makeAtmosphere(scene: THREE.Scene): { sky: THREE.Mesh; clouds: THREE.Mesh } {
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

function buildDistrict(
  g: THREE.Group,
  def: DistrictDef,
  rng: () => number,
  collision: CollisionWorld,
  landmarks: Landmark[],
  interactables: Interactable[],
  interiors: Interior[],
  animated: { mesh: THREE.Object3D; spin: THREE.Vector3 }[],
  banners: THREE.Mesh[],
  debris: THREE.Object3D[],
): void {
  addPlatform(g, def, collision, debris)
  addRingRoad(g, def, collision)
  scatterBlocks(g, def, rng, collision, banners, debris)
  districtFlavor(g, def, rng, collision, landmarks, interactables, interiors, animated, banners, debris)
  addLamps(g, def, rng)
}

function addPlatform(g: THREE.Group, def: DistrictDef, collision: CollisionWorld, debris: THREE.Object3D[]): void {
  const mat = new THREE.MeshStandardMaterial({
    color: def.palette.stone,
    roughness: 0.86,
    metalness: def.id === 'industrial' ? 0.25 : 0.05,
  })
  const under = new THREE.MeshStandardMaterial({
    color: def.palette.under,
    roughness: 0.9,
  })
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R * 1.02, def.thickness, 48), mat)
  disk.position.y = def.y - def.thickness * 0.5
  g.add(disk)
  debris.push(disk)
  const cityFloor = collision.addFloor(0, def.y, 0, R * 2.05, R * 2.05, 1.2, `floor-${def.id}`)
  cityFloor.maxRadius = R - 6

  const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.99, 1.1, 6, 48), new THREE.MeshStandardMaterial({
    color: def.palette.trim,
    roughness: 0.6,
  }))
  lip.rotation.x = Math.PI * 0.5
  lip.position.y = def.y + 0.2
  g.add(lip)

  // Underside ribs so lower districts can read the city above.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const rib = new THREE.Mesh(new THREE.BoxGeometry(R * 1.7, 1.2, 2.2), under)
    rib.position.set(0, def.y - def.thickness - 0.4, 0)
    rib.rotation.y = a
    g.add(rib)
  }

  // View notches — carved courtyards so you always see other layers.
  const notchMat = new THREE.MeshStandardMaterial({ color: def.palette.fog, roughness: 1 })
  for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
    const cut = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 46), notchMat)
    cut.position.set(Math.sin(a) * (R - 28), def.y + 1.2, Math.cos(a) * (R - 28))
    cut.rotation.y = a
    g.add(cut)
  }
}

function addRingRoad(g: THREE.Group, def: DistrictDef, collision: CollisionWorld): void {
  const rail = new THREE.MeshStandardMaterial({ color: def.palette.trim, roughness: 0.5, metalness: 0.2 })
  for (const rad of [72, 148]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.35, 5, 64), rail)
    ring.rotation.x = Math.PI * 0.5
    ring.position.y = def.y + 1.1
    g.add(ring)
    collision.addFloor(0, def.y, 0, rad * 2 + 8, rad * 2 + 8, 0.4, `ring-${def.id}-${rad}`)
  }
}
