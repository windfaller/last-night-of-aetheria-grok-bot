import * as THREE from 'three'
import { DISTRICTS } from './config'
import type { Interactable } from './world'

export type NpcKind = 'worker' | 'vendor' | 'resident' | 'guard' | 'noble' | 'child' | 'named'

export type Npc = {
  id: string
  kind: NpcKind
  name: string
  mesh: THREE.Group
  path: THREE.Vector3[]
  pathIndex: number
  speed: number
  home: THREE.Vector3
  visibleAfter?: number
  hideAfter?: number
  fleeing: boolean
}

export function spawnNpcs(scene: THREE.Scene, interactables: Interactable[]): Npc[] {
  const npcs: Npc[] = []

  const named = [
    { id: 'npc-kael', name: '凱爾', color: 0x8a5a32, pos: v(12, 13, -8) },
    { id: 'npc-sera', name: '瑟拉', color: 0x9b1b4a, pos: v(8, 87, 6) },
    { id: 'npc-oren', name: '奧倫', color: 0xefe4d0, pos: v(-200, 164.2, -200) },
    { id: 'npc-duke', name: '公爵', color: 0xd4af37, pos: v(200, 238.2, -200) },
    { id: 'npc-vela', name: '薇拉', color: 0x7ec8e3, pos: v(0, 360.2, 200) },
    { id: 'lyra', name: '萊拉', color: 0xffc0a8, pos: v(200, 14.2, 196), child: true },
    { id: 'child-a', name: '彌', color: 0xffd0b0, pos: v(-70, 163, 90), child: true },
    { id: 'child-b', name: '諾', color: 0xffd0b0, pos: v(64, 87, -12), child: true },
    { id: 'staff-0', name: '總管', color: 0xe8e0d4, pos: v(20, 237, 24) },
    { id: 'staff-1', name: '園丁', color: 0x4a6b4a, pos: v(-40, 237, -30) },
    { id: 'staff-2', name: '侍從', color: 0xc9b48a, pos: v(70, 237, 50) },
  ]
  for (const n of named) {
    const mesh = figure(n.color, !!n.child)
    mesh.position.copy(n.pos)
    scene.add(mesh)
    npcs.push({
      id: n.id,
      kind: n.child ? 'child' : 'named',
      name: n.name,
      mesh,
      path: [n.pos.clone()],
      pathIndex: 0,
      speed: 1.6,
      home: n.pos.clone(),
      fleeing: false,
    })
  }

  // Workers commute industrial ↔ market
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const home = v(Math.sin(a) * 90, 13, Math.cos(a) * 90)
    const work = v(Math.sin(a + 1) * 70, 87, Math.cos(a + 1) * 70)
    const mesh = figure(0x6a4a32, false)
    mesh.position.copy(home)
    scene.add(mesh)
    npcs.push({
      id: `worker-${i}`,
      kind: 'worker',
      name: '技工',
      mesh,
      path: [home, work, v(0, 87, 0), home],
      pathIndex: i % 3,
      speed: 2.4,
      home,
      fleeing: false,
    })
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const p = v(Math.sin(a) * 60, 87, Math.cos(a) * 60)
    const mesh = figure(0xe8a23a, false)
    mesh.position.copy(p)
    scene.add(mesh)
    npcs.push({
      id: `vendor-n-${i}`,
      kind: 'vendor',
      name: '攤販',
      mesh,
      path: [p, v(Math.sin(a + 0.4) * 80, 87, Math.cos(a + 0.4) * 80)],
      pathIndex: 0,
      speed: 1.3,
      home: p,
      visibleAfter: i >= 5 ? 10 * 60 : undefined,
      fleeing: false,
    })
    if (i >= 5) mesh.visible = false
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const home = v(Math.sin(a) * 100, 163, Math.cos(a) * 100)
    const chapel = v(-20, 163, -40)
    const mesh = figure(0xc45c3a, false)
    mesh.position.copy(home)
    scene.add(mesh)
    npcs.push({
      id: `res-${i}`,
      kind: 'resident',
      name: '住民',
      mesh,
      path: [home, chapel, v(Math.sin(a + 2) * 80, 163, Math.cos(a + 2) * 80)],
      pathIndex: 0,
      speed: 1.8,
      home,
      fleeing: false,
    })
  }

  for (let i = 0; i < 6; i++) {
    const y = DISTRICTS[i % DISTRICTS.length].y + 0.1
    const path = [
      v(40, y, -160),
      v(160, y, 0),
      v(40, y, 160),
      v(-160, y, 40),
    ]
    const mesh = figure(0x4a5a78, false, true)
    mesh.position.copy(path[i % path.length])
    scene.add(mesh)
    npcs.push({
      id: `guard-${i}`,
      kind: 'guard',
      name: '衛士',
      mesh,
      path,
      pathIndex: i,
      speed: 2.8,
      home: path[0],
      fleeing: false,
    })
  }

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const p = v(Math.sin(a) * 40, 237, Math.cos(a) * 40)
    const mesh = figure(0xe8e0d4, false)
    mesh.position.copy(p)
    scene.add(mesh)
    npcs.push({
      id: `noble-${i}`,
      kind: 'noble',
      name: '貴族',
      mesh,
      path: [p, v(52, 237, -10), p],
      pathIndex: 0,
      speed: 1.2,
      home: p,
      hideAfter: 15 * 60,
      fleeing: false,
    })
  }

  void interactables
  return npcs
}

export function updateNpcs(npcs: Npc[], dt: number, elapsed: number, collapsing: boolean, player: THREE.Vector3, followId: string | null): void {
  for (const npc of npcs) {
    if (npc.visibleAfter !== undefined) npc.mesh.visible = elapsed >= npc.visibleAfter
    if (npc.hideAfter !== undefined && elapsed >= npc.hideAfter && !npc.fleeing) {
      npc.fleeing = true
    }
    if (followId && npc.id === followId) {
      const dx = player.x - npc.mesh.position.x
      const dz = player.z - npc.mesh.position.z
      const dist = Math.hypot(dx, dz)
      if (dist > 2.2) {
        npc.mesh.position.x += (dx / dist) * 6.2 * dt
        npc.mesh.position.z += (dz / dist) * 6.2 * dt
        npc.mesh.position.y = player.y
        npc.mesh.rotation.y = Math.atan2(dx, dz)
      }
      continue
    }
    if (collapsing) {
      npc.fleeing = true
      npc.mesh.position.x += Math.sin(elapsed + npc.pathIndex) * 3 * dt
      npc.mesh.position.y -= dt * 0.4
      continue
    }
    if (npc.path.length < 2) continue
    const target = npc.path[npc.pathIndex % npc.path.length]
    const dx = target.x - npc.mesh.position.x
    const dz = target.z - npc.mesh.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1.2) {
      npc.pathIndex++
      continue
    }
    npc.mesh.position.x += (dx / dist) * npc.speed * dt
    npc.mesh.position.z += (dz / dist) * npc.speed * dt
    npc.mesh.position.y += (target.y - npc.mesh.position.y) * Math.min(1, dt * 3)
    npc.mesh.rotation.y = Math.atan2(dx, dz)
  }
}

function figure(color: number, child: boolean, guard = false): THREE.Group {
  const g = new THREE.Group()
  const scale = child ? 0.7 : 1
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22 * scale, 0.7 * scale, 3, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
  )
  body.position.y = 0.85 * scale
  g.add(body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 * scale, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8c4a8 }),
  )
  head.position.y = 1.42 * scale
  g.add(head)
  if (guard) {
    const spear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x888070, metalness: 0.4 }),
    )
    spear.position.set(0.28, 1.0, 0.1)
    g.add(spear)
  }
  return g
}

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z)
}
