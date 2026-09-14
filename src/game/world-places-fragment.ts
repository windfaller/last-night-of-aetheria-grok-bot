function placeElevators(
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

function placeVerticalClimbs(root: THREE.Group, collision: CollisionWorld, debris: THREE.Object3D[]): void {
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

function placeBridges(root: THREE.Group, collision: CollisionWorld, debris: THREE.Object3D[]): void {
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

function placeAirships(root: THREE.Group, airships: Airship[], interactables: Interactable[]): void {
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
