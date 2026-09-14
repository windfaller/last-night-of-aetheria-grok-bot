function districtFlavor(
  g: THREE.Group,
  def: DistrictDef,
  rng: () => number,
  collision: CollisionWorld,
  landmarks: Landmark[],
  _interactables: Interactable[],
  _interiors: Interior[],
  animated: { mesh: THREE.Object3D; spin: THREE.Vector3 }[],
  banners: THREE.Mesh[],
  debris: THREE.Object3D[],
): void {
  const y = def.y
  if (def.id === 'industrial') {
    const brass = new THREE.MeshStandardMaterial({ color: 0xb8863b, metalness: 0.7, roughness: 0.35 })
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.6, 16), brass)
    gear.rotation.x = Math.PI * 0.5
    gear.position.set(-8, y + 8, -6)
    g.add(gear)
    animated.push({ mesh: gear, spin: new THREE.Vector3(0, 0, 0.4) })
    debris.push(gear)
    const gear2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 1.2, 12), brass)
    gear2.position.set(6, y + 6, 10)
    gear2.rotation.x = Math.PI * 0.5
    g.add(gear2)
    animated.push({ mesh: gear2, spin: new THREE.Vector3(0, 0, -0.65) })
    for (let i = 0; i < 18; i++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 18 + rng() * 20, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c3a2a, metalness: 0.4, roughness: 0.5 }),
      )
      const a = rng() * Math.PI * 2
      const rad = 50 + rng() * 130
      pipe.position.set(Math.sin(a) * rad, y - def.thickness - 10 - rng() * 8, Math.cos(a) * rad)
      g.add(pipe)
    }
    const foundry = landmarkBuilding(g, y, 28, -40, 22, 16, 14, 0x4a3024, 'foundry')
    collision.add(box(28, y, -40, 22, 14, 16, 'solid', 'foundry-shell'))
    landmarks.push({ id: 'foundry', district: 'industrial', position: new THREE.Vector3(28, y, -22), label: '心輪鑄造廠' })
    for (let i = 0; i < 5; i++) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 3.2, 28 + i * 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 }),
      )
      stack.position.set(-70 + i * 12, y + 16 + i * 2, 110)
      g.add(stack)
      debris.push(stack)
    }
    void foundry
  }

  if (def.id === 'market') {
    const cloth = [0xe8a23a, 0x9b1b4a, 0x2d6a4f, 0xc45c3a]
    const stallGeo = new THREE.BoxGeometry(3.2, 0.15, 2.4)
    const n = 70
    const stalls = new THREE.InstancedMesh(
      stallGeo,
      new THREE.MeshStandardMaterial({ color: 0x6b3e26 }),
      n,
    )
    const dummy = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2
      const rad = 42 + (i % 5) * 16
      dummy.position.set(Math.sin(a) * rad, y + 2.5, Math.cos(a) * rad)
      dummy.rotation.y = a
      dummy.updateMatrix()
      stalls.setMatrixAt(i, dummy.matrix)
      const awn = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.08, 2.5),
        new THREE.MeshStandardMaterial({ color: cloth[i % cloth.length] }),
      )
      awn.position.copy(dummy.position)
      awn.position.y = y + 3.3
      awn.rotation.y = a
      g.add(awn)
      banners.push(awn)
    }
    g.add(stalls)
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0xc4783a, roughness: 0.7 }),
    )
    plaza.position.y = y + 0.15
    g.add(plaza)
    landmarks.push({ id: 'bazaar', district: 'market', position: new THREE.Vector3(0, y, 0), label: '夜市廣場' })
    const clock = new THREE.Mesh(
      new THREE.BoxGeometry(8, 36, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b3e26, roughness: 0.65 }),
    )
    clock.position.set(-14, y + 18, -14)
    g.add(clock)
    collision.add(box(-14, y, -14, 8, 36, 8, 'solid', 'clocktower'))
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xf2e2b0, emissive: 0xc9a227, emissiveIntensity: 0.35 }),
    )
    face.position.set(-14, y + 28, -9.8)
    g.add(face)
    const teahouse = landmarkBuilding(g, y, -36, 48, 18, 16, 10, 0x6b3e26, 'teahouse')
    collision.add(box(-36, y, 48, 18, 10, 16, 'solid', 'teahouse-shell'))
    void teahouse
  }

  if (def.id === 'residential') {
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 0.9 })
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3820 })
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2
      const rad = 48 + rng() * 140
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.2, 5), trunk)
      t.position.set(Math.sin(a) * rad, y + 1.6, Math.cos(a) * rad)
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.1, 6, 5), leaf)
      canopy.position.set(t.position.x, y + 4.1, t.position.z)
      g.add(t)
      g.add(canopy)
    }
    const chapel = landmarkBuilding(g, y, -20, -56, 20, 16, 18, 0xefe4d0, 'chapel')
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 10, 6),
      new THREE.MeshStandardMaterial({ color: 0xc45c3a }),
    )
    spire.position.set(-20, y + 23, -56)
    g.add(spire)
    collision.add(box(-20, y, -56, 20, 18, 16, 'solid', 'chapel-shell'))
    landmarks.push({ id: 'chapel', district: 'residential', position: new THREE.Vector3(-20, y, -40), label: '末鐘禮拜堂' })
    void chapel
  }

  if (def.id === 'gardens') {
    const hedgeM = new THREE.MeshStandardMaterial({ color: 0x2d4a32, roughness: 0.85 })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const hedge = new THREE.Mesh(new THREE.TorusGeometry(18 + i * 2, 0.7, 5, 24), hedgeM)
      hedge.rotation.x = Math.PI * 0.5
      hedge.position.set(Math.sin(a) * 8, y + 1.2, Math.cos(a) * 8)
      g.add(hedge)
    }
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a6a88, metalness: 0.4, roughness: 0.15 }),
    )
    pool.position.y = y + 0.15
    g.add(pool)
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d4 }),
    )
    fountain.position.y = y + 2
    g.add(fountain)
    const manor = landmarkBuilding(g, y, 52, -18, 28, 20, 14, 0xe8e0d4, 'manor')
    collision.add(box(52, y, -18, 28, 14, 20, 'solid', 'manor-shell'))
    landmarks.push({ id: 'manor', district: 'gardens', position: new THREE.Vector3(36, y, -18), label: '奧德里奇莊園' })
    const colM = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.45 })
    for (let i = 0; i < 10; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 9, 8), colM)
      col.position.set(-80 + i * 6, y + 4.5, 90)
      g.add(col)
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(58, 1.2, 2.4), colM)
    lintel.position.set(-53, y + 9.4, 90)
    g.add(lintel)
    void manor
  }

  if (def.id === 'observatory') {
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.75, roughness: 0.28 })
    const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({
      color: 0x1e2a44,
      metalness: 0.2,
      roughness: 0.45,
    }))
    dome.position.set(0, y + 18, 0)
    g.add(dome)
    debris.push(dome)
    const slit = new THREE.Mesh(new THREE.BoxGeometry(3, 14, 18), brass)
    slit.position.set(0, y + 22, 0)
    g.add(slit)
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 22, 10), brass)
    scope.position.set(4, y + 20, 2)
    scope.rotation.z = 0.7
    g.add(scope)
    animated.push({ mesh: scope, spin: new THREE.Vector3(0, 0.05, 0) })
    collision.add(box(0, y, 0, 28, 20, 28, 'solid', 'dome-shell'))
    landmarks.push({ id: 'dome', district: 'observatory', position: new THREE.Vector3(18, y, 18), label: '王室觀星穹頂' })
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2, 10, 6), brass)
      pylon.position.set(Math.sin(a) * 70, y + 5, Math.cos(a) * 70)
      g.add(pylon)
    }
  }
}

function landmarkBuilding(
  g: THREE.Group,
  y: number,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: number,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.08 }),
  )
  mesh.position.set(x, y + h * 0.5, z)
  mesh.name = name
  g.add(mesh)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.8 }),
  )
  door.position.set(x, y + 1.6, z + d * 0.5 + 0.1)
  g.add(door)
  return mesh
}
