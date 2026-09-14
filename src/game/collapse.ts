import * as THREE from 'three'
import type { DistrictId } from './config'
import { DISTRICTS } from './config'
import type { WorldData } from './world'
import type { Outcome } from './quests'

export class CollapseSystem {
  active = false
  t = 0
  private velocities = new Map<THREE.Object3D, THREE.Vector3>()
  private spins = new Map<THREE.Object3D, THREE.Vector3>()

  start(world: WorldData, outcome: Outcome): void {
    this.active = true
    this.t = 0
    for (const ship of world.airships) {
      ship.fleeing = true
    }
    for (const mesh of world.debrisMeshes) {
      if (mesh.userData.fallback) continue
      this.velocities.set(mesh, new THREE.Vector3((Math.random() - 0.5) * 2, -1 - Math.random() * 2, (Math.random() - 0.5) * 2))
      this.spins.set(mesh, new THREE.Vector3(Math.random() * 0.2, Math.random() * 0.4, Math.random() * 0.2))
    }
    void outcome
  }

  update(dt: number, world: WorldData, outcome: Outcome): void {
    if (!this.active) return
    this.t += dt
    const sky = world.sky.material as THREE.ShaderMaterial
    sky.uniforms.uCollapse.value = Math.min(1, this.t / 20)
    const clouds = world.clouds.material as THREE.ShaderMaterial
    clouds.uniforms.uCollapse.value = Math.min(1, this.t / 16)
    world.sun.color.setHex(0xff6a2a)
    world.sun.intensity = 2.4
    if (world.root.parent) {
      const camShake = world.root
      void camShake
    }

    const tilt = (id: DistrictId, amount: number, axis: 'x' | 'z', delay: number) => {
      if (this.t < delay) return
      const g = world.districtGroups.get(id)
      if (!g) return
      const k = Math.min(1, (this.t - delay) / 40)
      if (axis === 'x') g.rotation.x = amount * k
      else g.rotation.z = amount * k
      g.position.y -= dt * k * 1.8
    }

    tilt('industrial', 0.55, 'x', outcome.anchors >= 3 ? 35 : 8)
    tilt('market', 0.35, 'z', 22)
    tilt('residential', 0.4, 'x', 45)
    tilt('gardens', outcome.relicTaken ? 0.12 : 0.5, 'z', outcome.relicTaken ? 70 : 38)
    tilt('observatory', 0.28, 'x', 55)

    if (this.t > 18) {
      world.collision.disableId('bridge-0')
      world.collision.disableId('bridge-1')
    }
    if (this.t > 40) {
      world.collision.disableId('bridge-2')
      if (!outcome.lyraSaved) world.collision.disableId('lift-w')
    }
    if (this.t > 70) {
      world.collision.disableId('bridge-3')
      world.collision.disableId('bridge-4')
    }
    if (this.t > 90 && !outcome.relicTaken) {
      world.collision.disableId('floor-gardens')
    }

    for (const [mesh, vel] of this.velocities) {
      vel.y -= 6 * dt
      mesh.position.addScaledVector(vel, dt)
      const sp = this.spins.get(mesh)
      if (sp) {
        mesh.rotation.x += sp.x * dt
        mesh.rotation.y += sp.y * dt
        mesh.rotation.z += sp.z * dt
      }
    }

    for (const ship of world.airships) {
      ship.group.position.x += 18 * dt
      ship.group.position.y += 9 * dt
      ship.group.position.z += Math.sin(this.t + ship.phase) * 6 * dt
      ship.group.rotation.z = -0.35
      ship.group.rotation.x = 0.12
    }

    // Falling debris shards for readability
    if (Math.random() < 0.15) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(1 + Math.random() * 3, 0.6, 1 + Math.random() * 2),
        new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8 }),
      )
      const d = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)]
      shard.position.set((Math.random() - 0.5) * 300, d.y + 20, (Math.random() - 0.5) * 300)
      world.root.add(shard)
      this.velocities.set(shard, new THREE.Vector3((Math.random() - 0.5) * 8, -12, (Math.random() - 0.5) * 8))
      this.spins.set(shard, new THREE.Vector3(Math.random(), Math.random(), Math.random()))
    }
  }
}
