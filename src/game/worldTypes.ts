import * as THREE from 'three'
import { GAME, type DistrictId } from './config'
import type { CollisionWorld } from './collision'

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

export const R = GAME.cityRadius
