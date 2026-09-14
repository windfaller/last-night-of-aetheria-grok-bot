import * as THREE from 'three'
import { DISTRICTS } from './config'
import { CollisionWorld } from './collision'
import { mulberry32 } from './rng'
import type { Airship, Elevator, Interactable, Interior, Landmark, WorldData } from './worldTypes'
import { makeAtmosphere } from './worldAtmosphere'
import { buildDistrict } from './worldDistricts'
import {
  placeAirships,
  placeBeacons,
  placeBridges,
  placeElevators,
  placeQuestFixtures,
  placeVerticalClimbs,
} from './worldFixtures'

export type {
  Airship,
  Elevator,
  Interactable,
  Interior,
  Landmark,
  WorldData,
} from './worldTypes'

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
  const districtGroups = new Map<import('./config').DistrictId, THREE.Group>()

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
