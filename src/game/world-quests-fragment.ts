function placeQuestFixtures(
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

function makeInteriorRoom(root: THREE.Group, collision: CollisionWorld, id: string, x: number, y: number, z: number): void {
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

function placeBeacons(root: THREE.Group, interactables: Interactable[], beacons: THREE.Object3D[]): void {
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
