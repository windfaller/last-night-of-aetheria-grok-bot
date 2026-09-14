import * as THREE from 'three'
import { DISTRICTS, type DistrictId } from './config'
import { CollisionWorld, box } from './collision'
import type { Airship, Elevator, Interactable, Interior, Landmark } from './worldTypes'

export function placeElevators(
  root: THREE.Group,
  collision: CollisionWorld,
  elevators: Elevator[],
  interactables: Interactable[],
): void {
  const stops = DISTRICTS.map((d) => d.y)
  const spots = [
    { id: 'lift-center', x: 0, z: 0 },
    { id: 'lift-n', x: 0, z: -168 },
    { id: 'lift-s', x: 0, z: 168 },
    { id: 'lift-e', x: 168, z: 0 },
    { id: 'lift-w', x: -168, z: 0 },
  ]
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35 })
  const frame = new THREE.MeshStandardMaterial({ color: 0x3a3228, metalness: 0.3, roughness: 0.6 })
  for (const s of spots) {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(6.4, 340, 6.4), new THREE.MeshStandardMaterial({
      color: 0x2a221c,
      transparent: true,
      opacity: 0.18,
    }))
    shaft.position.set(s.x, 170, s.z)
    root.add(shaft)
    for (const y of stops) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.4, 7.2), frame)
      ring.position.set(s.x, y + 0.2, s.z)
      root.add(ring)
    }
    const pad = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 6.4), brass)
    pad.position.set(s.x, stops[1] + 0.3, s.z)
    root.add(pad)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.1, 320, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.42,
      }),
    )
    beam.position.set(s.x, 170, s.z)
    root.add(beam)
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.45, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xfff0a8 }),
    )
    halo.rotation.x = Math.PI * 0.5
    halo.position.set(s.x, stops[1] + 0.7, s.z)
    root.add(halo)
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe6a0 }),
    )
    cap.position.set(s.x, stops[1] + 4.2, s.z)
    root.add(cap)
    const elev: Elevator = {
      id: s.id,
      mesh: pad,
      x: s.x,
      z: s.z,
      stops,
      stopIndex: 1,
      targetY: stops[1] + 0.3,
      y: stops[1] + 0.3,
      moving: false,
      shaftMin: stops[0],
      shaftMax: stops[4] + 8,
    }
    elevators.push(elev)
    collision.addFloor(s.x, stops[1] + 0.55, s.z, 5.4, 5.4, 0.5, s.id)
    interactables.push({
      id: s.id,
      position: new THREE.Vector3(s.x, stops[1] + 1, s.z),
      radius: 3.2,
      label: '站上金色光柱，按 E 前往下一層',
      kind: 'elevator',
    })
  }
}

export function placeVerticalClimbs(root: THREE.Group, collision: CollisionWorld, debris: THREE.Object3D[]): void {
  const ivy = new THREE.MeshStandardMaterial({ color: 0x3a5a32, roughness: 0.9 })
  const pipe = new THREE.MeshStandardMaterial({ color: 0x6a4a32, metalness: 0.4, roughness: 0.5 })
  const climbs = [
    { x: 88, z: 88, from: 0, to: 4, mat: ivy },
    { x: -88, z: 88, from: 0, to: 4, mat: pipe },
    { x: 88, z: -88, from: 1, to: 4, mat: ivy },
    { x: -92, z: -40, from: 0, to: 2, mat: pipe },
    { x: 40, z: -100, from: 2, to: 4, mat: ivy },
  ]
  for (const c of climbs) {
    const y0 = DISTRICTS[c.from].y
    const y1 = DISTRICTS[c.to].y + 6
    const h = y1 - y0
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, h, 0.7), c.mat)
    mesh.position.set(c.x, y0 + h * 0.5, c.z)
    root.add(mesh)
    debris.push(mesh)
    collision.add(box(c.x, y0, c.z, 2.6, h, 1.4, 'climb', `climb-${c.x}-${c.z}`))
  }
}

export function placeBridges(root: THREE.Group, collision: CollisionWorld, debris: THREE.Object3D[]): void {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.75 })
  const pairs: [DistrictId, DistrictId, number, number, number][] = [
    ['industrial', 'market', 40, 40, 8],
    ['market', 'residential', -50, 30, 8],
    ['residential', 'gardens', 60, -20, 7],
    ['gardens', 'observatory', -30, -50, 7],
    ['market', 'residential', 90, -80, 6],
  ]
  let i = 0
  for (const [a, b, x, z, w] of pairs) {
    const da = DISTRICTS.find((d) => d.id === a)!
    const db = DISTRICTS.find((d) => d.id === b)!
    const y0 = da.y
    const y1 = db.y
    const h = Math.hypot(0, y1 - y0)
    const midY = (y0 + y1) * 0.5
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, h + 4), wood)
    mesh.position.set(x, midY, z)
    mesh.rotation.x = Math.atan2(y1 - y0, 8) * 0
    mesh.scale.set(1, 1, 1)
    // Stair-step ramps as stacked floors
    const steps = 18
    const run = 56
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const sy = y0 + (y1 - y0) * t
      const sx = x + (t - 0.5) * run
      const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, 5.2), wood)
      plank.position.set(sx, sy + 0.2, z)
      plank.userData.bridgeId = `bridge-${i}`
      root.add(plank)
      collision.addFloor(sx, sy + 0.4, z, w, 6, 0.45, `bridge-${i}`)
      debris.push(plank)
    }
    void mesh
    void h
    i++
  }
}

export function placeAirships(root: THREE.Group, airships: Airship[], interactables: Interactable[]): void {
  const hullM = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.5, metalness: 0.15 })
  const finM = new THREE.MeshStandardMaterial({ color: 0x7a1e3a, roughness: 0.7 })
  const docks = [
    new THREE.Vector3(110, 92, 20),
    new THREE.Vector3(-120, 92, -30),
    new THREE.Vector3(30, 242, 130),
    new THREE.Vector3(-40, 318, 90),
    new THREE.Vector3(140, 20, -80),
  ]
  docks.forEach((dock, i) => {
    const group = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 10, 4, 8), hullM)
    hull.rotation.z = Math.PI * 0.5
    group.add(hull)
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 2.4), finM)
    fin.position.set(0, 2.2, -3)
    group.add(fin)
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0x4a3220 }))
    gondola.position.y = -2.2
    group.add(gondola)
    group.position.copy(dock)
    root.add(group)
    airships.push({ group, dock: dock.clone(), t: i * 1.3, phase: i, fleeing: false })
    if (i === 0) {
      interactables.push({
        id: 'ferry',
        position: dock.clone(),
        radius: 8,
        label: '天空渡輪（崩落時由此逃脫）',
        kind: 'ferry',
      })
    }
  })
}

export function placeQuestFixtures(
  root: THREE.Group,
  collision: CollisionWorld,
  interactables: Interactable[],
  interiors: Interior[],
  landmarks: Landmark[],
): void {
  const rooms: { id: string; x: number; y: number; z: number; label: string; outside: THREE.Vector3 }[] = [
    { id: 'foundry', x: 200, y: 14, z: 200, label: '心輪鑄造廠內部', outside: new THREE.Vector3(28, 13, -22) },
    { id: 'teahouse', x: -200, y: 88, z: 200, label: '商會茶寮', outside: new THREE.Vector3(-36, 87, 58) },
    { id: 'chapel', x: -200, y: 164, z: -200, label: '末鐘禮拜堂內部', outside: new THREE.Vector3(-20, 163, -40) },
    { id: 'manor', x: 200, y: 238, z: -200, label: '莊園大廳', outside: new THREE.Vector3(36, 237, -18) },
    { id: 'dome', x: 0, y: 360, z: 200, label: '觀星控制室', outside: new THREE.Vector3(18, 313, 22) },
  ]

  for (const r of rooms) {
    makeInteriorRoom(root, collision, r.id, r.x, r.y, r.z)
    interiors.push({
      id: r.id,
      doorIn: r.outside.clone(),
      spawn: new THREE.Vector3(r.x, r.y + 0.1, r.z + 6),
      doorOut: new THREE.Vector3(r.x, r.y + 0.1, r.z + 8.5),
      outside: r.outside.clone(),
      label: r.label,
    })
    interactables.push({
      id: `door-${r.id}`,
      position: r.outside.clone(),
      radius: 3.2,
      label: `進入${r.label}（E）`,
      kind: 'door',
    })
    interactables.push({
      id: `exit-${r.id}`,
      position: new THREE.Vector3(r.x, r.y + 0.1, r.z + 8.5),
      radius: 2.6,
      label: '離開建築（E）',
      kind: 'door',
    })
  }

  interactables.push({
    id: 'npc-kael',
    position: new THREE.Vector3(12, 13, -8),
    radius: 2.4,
    label: '工頭凱爾',
    kind: 'npc',
  })
  interactables.push({
    id: 'lyra',
    position: new THREE.Vector3(200, 14.2, 196),
    radius: 2.2,
    label: '萊拉',
    kind: 'child',
  })
  interactables.push({
    id: 'npc-sera',
    position: new THREE.Vector3(8, 87, 6),
    radius: 2.4,
    label: '商會主瑟拉',
    kind: 'npc',
  })
  interactables.push({
    id: 'vendor-0',
    position: new THREE.Vector3(46, 87, 22),
    radius: 2.2,
    label: '香料攤家族',
    kind: 'vendor',
  })
  interactables.push({
    id: 'vendor-1',
    position: new THREE.Vector3(-28, 87, 40),
    radius: 2.2,
    label: '織品攤家族',
    kind: 'vendor',
  })
  interactables.push({
    id: 'vendor-2',
    position: new THREE.Vector3(22, 87, -48),
    radius: 2.2,
    label: '銅器攤家族',
    kind: 'vendor',
  })
  interactables.push({
    id: 'npc-oren',
    position: new THREE.Vector3(-200, 164.2, -200),
    radius: 2.4,
    label: '祭司奧倫',
    kind: 'npc',
  })
  interactables.push({
    id: 'child-a',
    position: new THREE.Vector3(-70, 163, 90),
    radius: 2.2,
    label: '走失的孩子・彌',
    kind: 'child',
  })
  interactables.push({
    id: 'child-b',
    position: new THREE.Vector3(64, 87, -12),
    radius: 2.2,
    label: '走失的孩子・諾',
    kind: 'child',
  })
  interactables.push({
    id: 'bell',
    position: new THREE.Vector3(-20, 163, -48),
    radius: 2.6,
    label: '疏散鐘',
    kind: 'bell',
  })
  interactables.push({
    id: 'npc-duke',
    position: new THREE.Vector3(200, 238.2, -200),
    radius: 2.4,
    label: '公爵奧德里奇',
    kind: 'npc',
  })
  interactables.push({
    id: 'relic',
    position: new THREE.Vector3(208, 238.2, -208),
    radius: 2.2,
    label: '星錨遺物',
    kind: 'relic',
  })
  interactables.push({
    id: 'staff-0',
    position: new THREE.Vector3(20, 237, 24),
    radius: 2.2,
    label: '庭園總管',
    kind: 'npc',
  })
  interactables.push({
    id: 'staff-1',
    position: new THREE.Vector3(-40, 237, -30),
    radius: 2.2,
    label: '園丁',
    kind: 'npc',
  })
  interactables.push({
    id: 'staff-2',
    position: new THREE.Vector3(70, 237, 50),
    radius: 2.2,
    label: '侍從',
    kind: 'npc',
  })
  interactables.push({
    id: 'npc-vela',
    position: new THREE.Vector3(0, 360.2, 200),
    radius: 2.4,
    label: '皇家星官薇拉',
    kind: 'npc',
  })
  interactables.push({
    id: 'anchor-0',
    position: new THREE.Vector3(70, 313, 0),
    radius: 2.6,
    label: '東星錨控制臺',
    kind: 'anchor',
  })
  interactables.push({
    id: 'anchor-1',
    position: new THREE.Vector3(-70, 313, 0),
    radius: 2.6,
    label: '西星錨控制臺',
    kind: 'anchor',
  })
  interactables.push({
    id: 'anchor-2',
    position: new THREE.Vector3(-8, 13, 70),
    radius: 2.6,
    label: '底層星錨（被鏽蝕掩蓋）',
    kind: 'anchor',
  })

  landmarks.push({ id: 'ferry-dock', district: 'market', position: new THREE.Vector3(110, 87, 20), label: '天空渡輪碼頭' })
}

export function makeInteriorRoom(root: THREE.Group, collision: CollisionWorld, id: string, x: number, y: number, z: number): void {
  const wall = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.85 })
  const floor = new THREE.MeshStandardMaterial({ color: 0x6a5340, roughness: 0.75 })
  const light = new THREE.MeshStandardMaterial({
    color: 0xffcc88,
    emissive: 0xffaa55,
    emissiveIntensity: 0.8,
  })
  const f = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 22), floor)
  f.position.set(x, y, z)
  root.add(f)
  collision.addFloor(x, y + 0.2, z, 22, 22, 0.5, `int-${id}`)
  const walls = [
    [x, y + 4, z - 11, 22, 8, 0.6],
    [x, y + 4, z + 11, 22, 8, 0.6],
    [x - 11, y + 4, z, 0.6, 8, 22],
    [x + 11, y + 4, z, 0.6, 8, 22],
  ] as const
  for (const [wx, wy, wz, ww, wh, wd] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wall)
    m.position.set(wx, wy, wz)
    root.add(m)
    collision.add(box(wx, y, wz, ww, wh, wd, 'solid', `intw-${id}`))
  }
  // Door gap on +Z wall: disable collision in the middle by adding a thinner side walls only — already a solid wall; we carve by not blocking the trigger zone much. Add a visible door hole marker.
  const hole = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.7), new THREE.MeshStandardMaterial({ color: 0x120e0c }))
  hole.position.set(x, y + 1.8, z + 10.7)
  root.add(hole)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), light)
  lamp.position.set(x, y + 6.5, z)
  root.add(lamp)
}

export function placeBeacons(root: THREE.Group, interactables: Interactable[], beacons: THREE.Object3D[]): void {
  const glow = new THREE.MeshBasicMaterial({
    color: 0xffe566,
    transparent: true,
    opacity: 0.95,
  })
  const geo = new THREE.OctahedronGeometry(1.15, 0)
  const shaft = new THREE.CylinderGeometry(0.08, 0.18, 4.2, 6)
  for (const it of interactables) {
    if (it.kind === 'elevator') continue
    const mark = new THREE.Mesh(geo, glow)
    mark.position.copy(it.position)
    mark.position.y += 3.1
    mark.userData.beacon = true
    mark.userData.beaconY = mark.position.y
    root.add(mark)
    beacons.push(mark)
    const pole = new THREE.Mesh(shaft, glow)
    pole.position.copy(it.position)
    pole.position.y += 1.1
    root.add(pole)
  }
}
