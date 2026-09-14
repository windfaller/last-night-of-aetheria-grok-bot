import * as THREE from 'three'
import { MOVE } from './config'
import type { CollisionWorld } from './collision'
import type { Input } from './input'

export type MoveState = 'walk' | 'climb' | 'elevator' | 'fly' | 'interior'

export class Player {
  readonly group = new THREE.Group()
  readonly mount = new THREE.Group()
  position = new THREE.Vector3(1.8, 88, 1.8)
  velocity = new THREE.Vector3()
  yaw = Math.PI
  pitch = 0.18
  state: MoveState = 'walk'
  grounded = false
  mounted = false
  lastGround = new THREE.Vector3(1.8, 88, 1.8)
  elevatorId: string | null = null
  interiorId: string | null = null
  climbBox: { minY: number; maxY: number } | null = null
  private bob = 0
  private limb = 0
  private cape!: THREE.Mesh
  private lArm!: THREE.Object3D
  private rArm!: THREE.Object3D
  private lLeg!: THREE.Object3D
  private rLeg!: THREE.Object3D
  private hair!: THREE.Object3D

  constructor() {
    this.buildKnight()
    this.buildMount()
    this.group.position.copy(this.position)
    this.mount.visible = false
  }

  attach(scene: THREE.Scene): void {
    scene.add(this.group)
    scene.add(this.mount)
  }

  update(
    dt: number,
    input: Input,
    collision: CollisionWorld,
    cameraYaw: number,
    elevDeltaY: number,
    canMount: boolean,
    nearGroundFly: number | null,
  ): void {
    if (input.mountPressed && canMount) {
      if (this.mounted) {
        if (nearGroundFly !== null) this.dismount(nearGroundFly)
      } else if (this.state !== 'interior' && this.state !== 'climb') {
        this.mountUp()
      }
    }

    if (this.mounted) {
      this.fly(dt, input, cameraYaw)
    } else if (this.state === 'climb' && this.climbBox) {
      this.climb(dt, input)
    } else if (this.state === 'elevator') {
      this.position.y += elevDeltaY
      this.walkPlanar(dt, input, cameraYaw, 0.35)
      this.collide(collision)
    } else {
      this.groundMove(dt, input, cameraYaw, collision)
    }

    this.group.position.copy(this.position)
    this.group.rotation.y = this.yaw
    this.animate(dt)
    if (this.mounted) {
      this.mount.position.copy(this.position)
      this.mount.position.y -= 0.9
      this.mount.rotation.y = this.yaw
      this.mount.rotation.x = this.velocity.y * 0.01
    }
    if (this.grounded && !this.mounted) this.lastGround.copy(this.position)
  }

  tryStartClimb(boxMaxY: number, boxMinY: number): void {
    if (this.mounted) return
    this.state = 'climb'
    this.climbBox = { minY: boxMinY, maxY: boxMaxY }
    this.velocity.set(0, 0, 0)
  }

  stopClimb(): void {
    if (this.state === 'climb') this.state = 'walk'
    this.climbBox = null
  }

  setElevator(id: string | null): void {
    this.elevatorId = id
    if (id) this.state = 'elevator'
    else if (this.state === 'elevator') this.state = 'walk'
  }

  enterInterior(id: string, pos: THREE.Vector3): void {
    this.interiorId = id
    this.state = 'interior'
    this.position.copy(pos)
    this.velocity.set(0, 0, 0)
    if (this.mounted) this.dismount(pos.y)
  }

  exitInterior(pos: THREE.Vector3): void {
    this.interiorId = null
    this.state = 'walk'
    this.position.copy(pos)
  }

  respawn(): void {
    this.position.copy(this.lastGround)
    this.velocity.set(0, 0, 0)
    this.mounted = false
    this.mount.visible = false
    this.state = this.interiorId ? 'interior' : 'walk'
    this.group.visible = true
  }

  private mountUp(): void {
    this.mounted = true
    this.state = 'fly'
    this.mount.visible = true
    this.velocity.y = Math.max(this.velocity.y, 4)
  }

  private dismount(y: number): void {
    this.mounted = false
    this.mount.visible = false
    this.state = this.interiorId ? 'interior' : 'walk'
    this.position.y = y
    this.velocity.set(0, 0.2, 0)
  }

  private fly(dt: number, input: Input, cameraYaw: number): void {
    const axis = input.axis()
    const speed = input.running() ? MOVE.flyBoost : MOVE.fly
    const fx = Math.sin(cameraYaw)
    const fz = Math.cos(cameraYaw)
    const rx = Math.sin(cameraYaw + Math.PI * 0.5)
    const rz = Math.cos(cameraYaw + Math.PI * 0.5)
    const wish = new THREE.Vector3(
      fx * axis.y + rx * axis.x,
      0,
      fz * axis.y + rz * axis.x,
    )
    if (input.flyUp()) wish.y += 1
    if (input.flyDown()) wish.y -= 1
    if (wish.lengthSq() > 1) wish.normalize()
    this.velocity.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 4))
    this.position.addScaledVector(this.velocity, dt)
    if (axis.y !== 0 || axis.x !== 0) {
      this.yaw = Math.atan2(this.velocity.x, this.velocity.z)
    }
  }

  private climb(dt: number, input: Input): void {
    const axis = input.axis()
    this.position.y += axis.y * MOVE.climb * dt
    this.position.x += Math.sin(this.yaw + Math.PI * 0.5) * axis.x * MOVE.climb * 0.6 * dt
    this.position.z += Math.cos(this.yaw + Math.PI * 0.5) * axis.x * MOVE.climb * 0.6 * dt
    if (this.climbBox) {
      this.position.y = Math.max(this.climbBox.minY, Math.min(this.climbBox.maxY + 0.2, this.position.y))
      if (this.position.y >= this.climbBox.maxY - 0.05) {
        this.position.y = this.climbBox.maxY
        this.stopClimb()
      }
    }
    if (input.jumpPressed && axis.y < 0.2) {
      this.velocity.y = 5
      this.velocity.x = Math.sin(this.yaw) * -4
      this.velocity.z = Math.cos(this.yaw) * -4
      this.stopClimb()
    }
  }

  private groundMove(dt: number, input: Input, cameraYaw: number, collision: CollisionWorld): void {
    const axis = input.axis()
    const speed = input.running() ? MOVE.run : MOVE.walk
    const fx = Math.sin(cameraYaw)
    const fz = Math.cos(cameraYaw)
    const rx = Math.sin(cameraYaw + Math.PI * 0.5)
    const rz = Math.cos(cameraYaw + Math.PI * 0.5)
    const wishX = fx * axis.y + rx * axis.x
    const wishZ = fz * axis.y + rz * axis.x
    const accel = this.grounded ? MOVE.groundAccel : MOVE.airAccel
    const targetX = wishX * speed
    const targetZ = wishZ * speed
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, accel * dt)
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, accel * dt)
    if (this.grounded && input.jumpPressed) {
      this.velocity.y = MOVE.jump
      this.grounded = false
    }
    this.velocity.y -= MOVE.gravity * dt
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    this.position.z += this.velocity.z * dt
    if (wishX !== 0 || wishZ !== 0) this.yaw = Math.atan2(wishX, wishZ)
    this.collide(collision)
  }

  private walkPlanar(dt: number, input: Input, cameraYaw: number, scale: number): void {
    const axis = input.axis()
    const speed = MOVE.walk * scale
    const fx = Math.sin(cameraYaw)
    const fz = Math.cos(cameraYaw)
    const rx = Math.sin(cameraYaw + Math.PI * 0.5)
    const rz = Math.cos(cameraYaw + Math.PI * 0.5)
    this.position.x += (fx * axis.y + rx * axis.x) * speed * dt
    this.position.z += (fz * axis.y + rz * axis.x) * speed * dt
  }

  collide(collision: CollisionWorld): void {
    const r = collision.resolve(this.position.x, this.position.y, this.position.z, MOVE.radius, MOVE.height)
    this.position.set(r.x, r.y, r.z)
    this.grounded = r.grounded
    if (r.grounded && this.velocity.y < 0) this.velocity.y = 0
    if (r.climb && this.state !== 'fly') {
      this.climbBox = { minY: r.climb.minY, maxY: r.climb.maxY }
    }
  }

  private animate(dt: number): void {
    const spd = this.mounted ? 0 : Math.hypot(this.velocity.x, this.velocity.z)
    this.limb += dt * (4 + spd * 1.6)
    this.bob += dt * (this.grounded ? 8 : 2)
    const swing = this.grounded && spd > 0.4 ? Math.sin(this.limb) * 0.55 : 0
    this.lArm.rotation.x = swing
    this.rArm.rotation.x = -swing
    this.lLeg.rotation.x = -swing * 0.9
    this.rLeg.rotation.x = swing * 0.9
    this.cape.rotation.x = 0.25 + Math.sin(this.bob) * 0.08 + (this.mounted ? 0.4 : 0)
    this.hair.rotation.x = -0.15 + Math.sin(this.bob * 0.7) * 0.04
    this.group.position.y = this.position.y + (this.grounded ? Math.abs(Math.sin(this.limb)) * Math.min(spd, 6) * 0.012 : 0)
    this.group.visible = !this.mounted
  }

  private buildKnight(): void {
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.7 })
    const armor = new THREE.MeshStandardMaterial({ color: 0x7a8fa8, metalness: 0.65, roughness: 0.35 })
    const cloth = new THREE.MeshStandardMaterial({ color: 0x2c1e4a, roughness: 0.8 })
    const hairM = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 })
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 })

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.22), armor)
    hips.position.y = 0.82
    this.group.add(hips)

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.26), armor)
    torso.position.y = 1.18
    this.group.add(torso)

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.2), gold)
    chest.position.set(0, 1.22, 0.06)
    this.group.add(chest)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skin)
    head.position.y = 1.58
    this.group.add(head)

    const hair = new THREE.Group()
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.3), hairM)
    helm.position.y = 1.72
    hair.add(helm)
    const braid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), hairM)
    braid.position.set(0.12, 1.38, -0.12)
    hair.add(braid)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.1), hairM)
    tail.position.set(0, 1.42, -0.18)
    hair.add(tail)
    this.hair = hair
    this.group.add(hair)

    this.lArm = this.limbBox(-0.28, 1.28, armor, 0.12, 0.42, 0.12)
    this.rArm = this.limbBox(0.28, 1.28, armor, 0.12, 0.42, 0.12)
    this.lLeg = this.limbBox(-0.12, 0.7, armor, 0.14, 0.55, 0.14)
    this.rLeg = this.limbBox(0.12, 0.7, armor, 0.14, 0.55, 0.14)

    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), cloth)
    cape.position.set(0, 1.05, -0.2)
    cape.rotation.x = 0.25
    this.cape = cape
    this.group.add(cape)

    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.18), gold)
    pauldronL.position.set(-0.28, 1.42, 0)
    this.group.add(pauldronL)
    const pauldronR = pauldronL.clone()
    pauldronR.position.x = 0.28
    this.group.add(pauldronR)
  }

  private limbBox(
    x: number,
    y: number,
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
  ): THREE.Object3D {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, 0)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.y = -h * 0.45
    pivot.add(mesh)
    this.group.add(pivot)
    return pivot
  }

  private buildMount(): void {
    const hide = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 0.45 })
    const wing = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.25, roughness: 0.5, side: THREE.DoubleSide })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.4, 4, 8), hide)
    body.rotation.z = Math.PI * 0.5
    body.position.y = 0.4
    this.mount.add(body)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.5), hide)
    head.position.set(0, 0.7, 1.05)
    this.mount.add(head)
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.28, 5),
      new THREE.MeshStandardMaterial({ color: 0xc9a227 }),
    )
    beak.rotation.x = Math.PI * 0.5
    beak.position.set(0, 0.62, 1.36)
    this.mount.add(beak)
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.7), wing)
      w.position.set(side * 0.9, 0.7, 0.1)
      w.rotation.z = side * 0.25
      w.name = side > 0 ? 'wingR' : 'wingL'
      this.mount.add(w)
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), hide)
    tail.position.set(0, 0.5, -1.1)
    this.mount.add(tail)
  }
}
