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
