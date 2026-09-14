import * as THREE from 'three'
import { GAME, type DistrictDef } from './config'
import { CollisionWorld, box } from './collision'
import { hash2 } from './rng'
import type { Interactable, Interior, Landmark } from './worldTypes'
import { R } from './worldTypes'
import { districtFlavor } from './worldFlavor'

export function buildDistrict(
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

function scatterBlocks(
  g: THREE.Group,
  def: DistrictDef,
  rng: () => number,
  collision: CollisionWorld,
  banners: THREE.Mesh[],
  debris: THREE.Object3D[],
): void {
  const cell = GAME.cell
  const stone = new THREE.MeshStandardMaterial({
    color: def.palette.stone,
    roughness: 0.72,
    emissive: def.palette.stone,
    emissiveIntensity: 0.12,
  })
  const accent = new THREE.MeshStandardMaterial({ color: def.palette.accent, roughness: 0.55 })
  const roof = new THREE.MeshStandardMaterial({ color: def.palette.trim, roughness: 0.7 })
  const glow = new THREE.MeshStandardMaterial({
    color: def.palette.light,
    emissive: def.palette.light,
    emissiveIntensity: 1.15,
  })

  const wallGeo = new THREE.BoxGeometry(1, 1, 1)
  const wallDummy = new THREE.Object3D()
  const wallMats: THREE.Matrix4[] = []
  const roofMats: THREE.Matrix4[] = []
  const winMats: THREE.Matrix4[] = []

  for (let ix = -12; ix <= 12; ix++) {
    for (let iz = -12; iz <= 12; iz++) {
      const x = ix * cell
      const z = iz * cell
      const dist = Math.hypot(x, z)
      if (dist > R - 16) continue
      if (dist < 36) continue
      const onAxis = Math.min(Math.abs(x), Math.abs(z)) < 10 && dist > 40
      if (onAxis) continue
      const hsh = hash2(ix + def.y * 0.01, iz + 17)
      if (hsh < 0.28) continue

      const w = 8 + rng() * 8
      const d = 8 + rng() * 8
      const stories = def.id === 'observatory' ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 4)
      const h = stories * (3.4 + rng() * 0.8)
      const px = x + (rng() - 0.5) * 4
      const pz = z + (rng() - 0.5) * 4

      wallDummy.position.set(px, def.y + h * 0.5, pz)
      wallDummy.scale.set(w, h, d)
      wallDummy.rotation.y = (Math.floor(rng() * 4) * Math.PI) / 2
      wallDummy.updateMatrix()
      wallMats.push(wallDummy.matrix.clone())

      wallDummy.position.y = def.y + h + 0.7
      wallDummy.scale.set(w + 1.2, 1.4, d + 1.2)
      wallDummy.updateMatrix()
      roofMats.push(wallDummy.matrix.clone())

      collision.add(box(px, def.y, pz, w * 0.92, h, d * 0.92, 'solid', `bldg-${def.id}-${ix}-${iz}`))

      const wins = 2 + Math.floor(rng() * 3)
      for (let s = 0; s < stories; s++) {
        for (let k = 0; k < wins; k++) {
          if (rng() < 0.25) continue
          wallDummy.position.set(px + (k - wins * 0.5) * 1.6, def.y + 1.4 + s * 3.2, pz + d * 0.51)
          wallDummy.scale.set(0.7, 0.9, 0.08)
          wallDummy.rotation.set(0, 0, 0)
          wallDummy.updateMatrix()
          winMats.push(wallDummy.matrix.clone())
        }
      }

      if (rng() < 0.35 && def.id !== 'industrial') {
        const ban = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 2.4),
          new THREE.MeshStandardMaterial({
            color: def.palette.accent,
            side: THREE.DoubleSide,
            roughness: 0.7,
          }),
        )
        ban.position.set(px, def.y + 3.2, pz + d * 0.52)
        g.add(ban)
        banners.push(ban)
      }

      debris.push(Object.assign(new THREE.Object3D(), { userData: { fallback: true } }))
    }
  }

  const walls = new THREE.InstancedMesh(wallGeo, stone, wallMats.length)
  wallMats.forEach((m, i) => walls.setMatrixAt(i, m))
  walls.instanceMatrix.needsUpdate = true
  g.add(walls)
  debris.push(walls)

  const roofs = new THREE.InstancedMesh(wallGeo, roof, roofMats.length)
  roofMats.forEach((m, i) => roofs.setMatrixAt(i, m))
  roofs.instanceMatrix.needsUpdate = true
  g.add(roofs)

  if (winMats.length) {
    const wins = new THREE.InstancedMesh(wallGeo, glow, winMats.length)
    winMats.forEach((m, i) => wins.setMatrixAt(i, m))
    wins.instanceMatrix.needsUpdate = true
    g.add(wins)
  }

  // Accent awnings / crates for density.
  const crateGeo = new THREE.BoxGeometry(1.4, 1.1, 1.4)
  const crateCount = 80
  const crates = new THREE.InstancedMesh(crateGeo, accent, crateCount)
  const dummy = new THREE.Object3D()
  let placed = 0
  while (placed < crateCount) {
    const a = rng() * Math.PI * 2
    const rad = 40 + rng() * (R - 50)
    dummy.position.set(Math.sin(a) * rad, def.y + 0.55, Math.cos(a) * rad)
    dummy.rotation.y = rng() * Math.PI
    dummy.scale.setScalar(0.8 + rng() * 0.6)
    dummy.updateMatrix()
    crates.setMatrixAt(placed, dummy.matrix)
    placed++
  }
  g.add(crates)
}

function addLamps(g: THREE.Group, def: DistrictDef, rng: () => number): void {
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6, metalness: 0.3 })
  const lightM = new THREE.MeshStandardMaterial({
    color: def.palette.light,
    emissive: def.palette.light,
    emissiveIntensity: 1.1,
  })
  const dummy = new THREE.Object3D()
  const n = 48
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 5), poleM, n)
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 6), lightM, n)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.05
    const rad = i % 2 === 0 ? 74 : 150
    dummy.position.set(Math.sin(a) * rad, def.y + 1.6, Math.cos(a) * rad)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    poles.setMatrixAt(i, dummy.matrix)
    dummy.position.y = def.y + 3.3
    dummy.updateMatrix()
    bulbs.setMatrixAt(i, dummy.matrix)
  }
  g.add(poles)
  g.add(bulbs)
}
