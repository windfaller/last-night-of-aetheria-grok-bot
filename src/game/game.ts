import * as THREE from 'three'
import { GAME, districtAtY } from './config'
import { Input } from './input'
import { GameAudio } from './audio'
import { Player } from './player'
import { buildWorld, type Elevator, type WorldData } from './world'
import { spawnNpcs, updateNpcs, type Npc } from './npcs'
import { QuestSystem } from './quests'
import { CollapseSystem } from './collapse'
import { HUD } from './hud'

export class Game {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(62, 1, 0.15, 1400)
  private input = new Input()
  private audio = new GameAudio()
  private player = new Player()
  private world!: WorldData
  private npcs: Npc[] = []
  private quests!: QuestSystem
  private collapse = new CollapseSystem()
  private hud: HUD
  private running = false
  private paused = false
  private ended = false
  private elapsed = 0
  private last = 0
  private camYaw = Math.PI
  private camPitch = 0.22
  private elevators: Elevator[] = []

  constructor(app: HTMLElement) {
    const canvas = document.createElement('canvas')
    canvas.id = 'view'
    this.hud = new HUD(app)
    const host = mustCanvas()
    host.replaceWith(canvas)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.35
    this.input.bind(canvas)
    window.addEventListener('resize', this.onResize)
    this.hud.onStart(() => this.start())
    this.hud.onResume(() => this.togglePause(false))
  }

  boot(): void {
    this.world = buildWorld(this.scene)
    this.elevators = this.world.elevators
    this.player.attach(this.scene)
    this.npcs = spawnNpcs(this.scene, this.world.interactables)
    this.quests = new QuestSystem(this.audio)
    this.camera.position.set(10, 96, 32)
    this.tick = this.tick.bind(this)
    requestAnimationFrame(this.tick)
  }

  private start(): void {
    this.audio.ensure()
    this.hud.hideTitle()
    this.running = true
    this.input.requestLock()
    this.hud.toast('你就站在中央升降臺上。按 E 往上一層，或 F 召喚嵐羽。')
  }

  private togglePause(force?: boolean): void {
    if (!this.running || this.ended) return
    this.paused = force ?? !this.paused
    this.hud.setPaused(this.paused)
    if (!this.paused) this.input.requestLock()
  }

  private tick = (now: number): void => {
    requestAnimationFrame(this.tick)
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016)
    this.last = now
    this.input.beginFrame()

    if (this.input.pausePressed && this.running && !this.ended && !this.quests.dialogue) {
      this.togglePause()
    }
    if (this.input.debugSkipPressed && this.running) {
      this.elapsed += 120
      this.hud.toast('時辰快轉了兩分鐘。')
    }
    if (this.input.debugCollapsePressed && this.running && !this.collapse.active) {
      this.beginCollapse()
    }

    if (this.running && !this.paused && !this.ended) {
      this.elapsed += dt
      if (this.quests.dialogue) {
        this.handleDialogueKeys()
      } else {
        this.simulate(dt)
      }
      this.quests.tryDeliverLyra(this.player.position)
    }

    this.animateWorld(dt)
    this.updateCamera(dt)
    this.drawHud()
    this.renderer.render(this.scene, this.camera)
    this.input.endFrame()
  }

  private simulate(dt: number): void {
    this.updateSky()
    this.updateElevators(dt)
    const elev = this.currentElevator()
    const elevDy = elev && elev.moving ? elev.y - elev.mesh.position.y : 0
    const ground = this.world.collision.groundY(this.player.position.x, this.player.position.y + 1.2, this.player.position.z, 6)
    const wasMounted = this.player.mounted
    this.player.update(
      dt,
      this.input,
      this.world.collision,
      this.camYaw,
      elevDy,
      this.player.state !== 'interior',
      this.player.mounted ? ground : null,
    )
    if (this.player.mounted && !wasMounted) this.hud.toast('嵐羽展開雙翼。空白鍵上升，Ctrl 下降，F 降落。')
    if (!this.player.mounted && wasMounted) this.hud.toast('雙腳回到石板上。')

    if (this.input.climbingHeld() && this.player.climbBox && this.player.state === 'walk') {
      this.player.tryStartClimb(this.player.climbBox.maxY, this.player.climbBox.minY)
    }

    if (elev) {
      const onPad = Math.hypot(this.player.position.x - elev.x, this.player.position.z - elev.z) < 3.2
      if (onPad && elev.moving) {
        this.player.setElevator(elev.id)
        this.player.position.y = elev.y + 0.3
      } else if (this.player.elevatorId === elev.id && !onPad) {
        this.player.setElevator(null)
      }
    }

    this.handleInteract()
    updateNpcs(this.npcs, dt, this.elapsed, this.collapse.active, this.player.position, this.quests.followId)
    this.syncFollowInteractables()

    if (this.collapse.active) {
      this.collapse.update(dt, this.world, this.quests.outcome)
      this.checkEscape()
      if (this.collapse.t > GAME.collapseEscapeSec && !this.ended) this.finish(false)
    } else if (this.elapsed >= GAME.durationSec + this.quests.extraTime) {
      this.beginCollapse()
    }

    if (this.player.position.y < -40) {
      if (this.collapse.active) this.finish(false)
      else {
        this.player.respawn()
        this.hud.toast('雲海把你吐回上一處立足點。時間沒有退還。')
        this.elapsed += 8
      }
    }

    this.audio.setWind(this.player.mounted ? 0.8 : this.collapse.active ? 1 : 0.25)
    this.flapMount()
  }

  private handleInteract(): void {
    if (!this.input.interactPressed) return
    const p = this.player.position
    let best: (typeof this.world.interactables)[number] | null = null
    let bestD = 99
    for (const it of this.world.interactables) {
      const d = p.distanceTo(it.position)
      if (d < it.radius && d < bestD) {
        best = it
        bestD = d
      }
    }
    if (!best) return

    if (best.kind === 'elevator') {
      const el = this.elevators.find((e) => e.id === best!.id)
      if (el && Math.hypot(p.x - el.x, p.z - el.z) < 3.4) {
        el.stopIndex = (el.stopIndex + 1) % el.stops.length
        el.targetY = el.stops[el.stopIndex] + 0.3
        el.moving = true
        this.hud.toast(`升降臺前往${districtAtY(el.targetY).nameZh}`)
        this.audio.interact()
      }
      return
    }

    if (best.kind === 'door') {
      if (best.id.startsWith('door-')) {
        const id = best.id.slice(5)
        const room = this.world.interiors.find((r) => r.id === id)
        if (room) {
          this.player.enterInterior(id, room.spawn)
          this.hud.toast(room.label)
        }
      } else if (best.id.startsWith('exit-')) {
        const id = best.id.slice(5)
        const room = this.world.interiors.find((r) => r.id === id)
        if (room) {
          this.player.exitInterior(room.outside.clone().add(new THREE.Vector3(0, 0, 4)))
          this.hud.toast('回到戶外')
        }
      }
      this.audio.interact()
      return
    }

    if (best.kind === 'ferry' && this.collapse.active) {
      this.quests.escapeOnFerry()
      this.finish(true)
      return
    }

    this.quests.interact(best, p)
  }

  private handleDialogueKeys(): void {
    const dlg = this.quests.dialogue
    if (!dlg) return
    const codes = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3']
    for (let i = 0; i < dlg.choices.length; i++) {
      if (this.input.keys.has(codes[i]) || this.input.keys.has(codes[i + 3])) {
        dlg.choices[i].run()
        break
      }
    }
  }

  private updateElevators(dt: number): void {
    for (const el of this.elevators) {
      const dy = el.targetY - el.y
      if (Math.abs(dy) < 0.05) {
        el.y = el.targetY
        el.moving = false
      } else {
        el.y += Math.sign(dy) * Math.min(Math.abs(dy), 12 * dt)
        el.moving = true
      }
      el.mesh.position.y = el.y
      const floor = this.world.collision.boxes.find((b) => b.id === el.id)
      if (floor) {
        const h = floor.maxY - floor.minY
        floor.minY = el.y - 0.2
        floor.maxY = el.y - 0.2 + h
      }
      const it = this.world.interactables.find((i) => i.id === el.id)
      if (it) it.position.set(el.x, el.y + 1, el.z)
    }
  }

  private currentElevator(): Elevator | null {
    let best: Elevator | null = null
    let bestD = 8
    for (const el of this.elevators) {
      const d = Math.hypot(this.player.position.x - el.x, this.player.position.z - el.z)
      if (d < bestD) {
        best = el
        bestD = d
      }
    }
    return best
  }

  private syncFollowInteractables(): void {
    if (!this.quests.followId) return
    const npc = this.npcs.find((n) => n.id === this.quests.followId)
    const it = this.world.interactables.find((i) => i.id === this.quests.followId)
    if (npc && it) it.position.copy(npc.mesh.position)
  }

  private beginCollapse(): void {
    this.collapse.start(this.world, this.quests.outcome)
    this.quests.failRemaining()
    this.audio.danger()
    this.hud.toast('午夜到了。城開始從你認得的地方斷開。')
    this.scene.fog = new THREE.Fog(0x5a2010, 160, 720)
  }

  private checkEscape(): void {
    const ferry = this.world.interactables.find((i) => i.id === 'ferry')
    if (ferry) {
      ferry.position.copy(this.world.airships[0].group.position)
      ferry.label = '跳上逃脫渡輪（E）'
    }
    if (this.player.mounted && this.player.position.y > 390 && this.player.position.length() > 80) {
      this.quests.escapeOnMount()
      this.finish(true)
    }
  }

  private finish(escaped: boolean): void {
    if (this.ended) return
    this.ended = true
    this.running = false
    document.exitPointerLock()
    if (escaped) this.quests.outcome.escaped = true
    const title = escaped ? '你逃出了埃特里亞' : '你與城一同落下'
    this.hud.showEnding(title, this.quests.summary())
  }

  private updateSky(): void {
    const deadline = GAME.durationSec + this.quests.extraTime
    const night = THREE.MathUtils.clamp(this.elapsed / deadline, 0, 1)
    const sky = this.world.sky.material as THREE.ShaderMaterial
    sky.uniforms.uNight.value = night
    const clouds = this.world.clouds.material as THREE.ShaderMaterial
    clouds.uniforms.uTime.value = this.elapsed
    clouds.uniforms.uNight.value = night
    this.world.sun.intensity = 2.15 - night * 0.55
    this.world.hemi.intensity = 1.35 - night * 0.2
  }

  private animateWorld(dt: number): void {
    for (const a of this.world.animated) {
      a.mesh.rotation.x += a.spin.x * dt
      a.mesh.rotation.y += a.spin.y * dt
      a.mesh.rotation.z += a.spin.z * dt
    }
    for (const b of this.world.banners) {
      b.rotation.z = Math.sin(this.elapsed * 1.6 + b.position.x) * 0.12
    }
    for (const obj of this.world.beacons) {
      obj.rotation.y += dt * 1.8
      obj.position.y = (obj.userData.beaconY as number) + Math.sin(this.elapsed * 3 + obj.position.x) * 0.25
    }
    if (!this.collapse.active) {
      for (const ship of this.world.airships) {
        ship.t += dt
        const hover = Math.sin(ship.t * 0.7 + ship.phase) * 1.2
        ship.group.position.copy(ship.dock)
        ship.group.position.y = ship.dock.y + hover
        ship.group.rotation.y = Math.sin(ship.t * 0.2) * 0.15
      }
    }
    if (this.collapse.active) {
      this.camera.position.x += Math.sin(this.elapsed * 28) * 0.04
      this.camera.position.y += Math.cos(this.elapsed * 22) * 0.03
    }
  }

  private flapMount(): void {
    if (!this.player.mounted) return
    const t = this.elapsed
    this.player.mount.traverse((o: THREE.Object3D) => {
      if (o.name === 'wingL') o.rotation.z = -0.4 + Math.sin(t * 10) * 0.45
      if (o.name === 'wingR') o.rotation.z = 0.4 - Math.sin(t * 10) * 0.45
    })
  }

  private updateCamera(dt: number): void {
    this.camYaw -= this.input.mouseDX * 0.0022
    this.camPitch -= this.input.mouseDY * 0.0022
    this.camPitch = Math.max(-0.9, Math.min(0.95, this.camPitch))
    const dist = this.player.mounted ? 8.5 : 5.4
    const height = this.player.mounted ? 2.8 : 1.7
    const target = this.player.position.clone()
    target.y += height
    const ox = Math.sin(this.camYaw) * -dist * Math.cos(this.camPitch)
    const oy = Math.sin(this.camPitch) * dist
    const oz = Math.cos(this.camYaw) * -dist * Math.cos(this.camPitch)
    const desired = target.clone().add(new THREE.Vector3(ox, oy + 1.2, oz))
    const camRay = this.world.collision.groundY(desired.x, desired.y, desired.z, 2)
    if (camRay !== null && desired.y < camRay + 0.4) desired.y = camRay + 0.4
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 10))
    this.camera.lookAt(target)
  }

  private drawHud(): void {
    if (!this.quests) return
    const p = this.player.position
    let prompt = ''
    if (!this.quests.dialogue && this.running) {
      for (const it of this.world.interactables) {
        if (p.distanceTo(it.position) < it.radius) {
          prompt = it.label
          break
        }
      }
      if (this.player.climbBox && this.player.state === 'walk') {
        prompt = prompt || '按住 C 或空白鍵攀爬'
      }
    }
    this.hud.render(
      this.elapsed,
      GAME.durationSec + this.quests.extraTime,
      p.y,
      this.player.state,
      this.player.mounted,
      this.quests,
      prompt,
      this.collapse.active,
      this.collapse.t,
    )
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

function mustCanvas(): HTMLCanvasElement {
  const el = document.querySelector('#view')
  if (el instanceof HTMLCanvasElement) return el
  throw new Error('canvas')
}
