export class Input {
  readonly keys = new Set<string>()
  mouseDX = 0
  mouseDY = 0
  pointerLocked = false
  interactPressed = false
  mountPressed = false
  jumpPressed = false
  pausePressed = false
  debugSkipPressed = false
  debugCollapsePressed = false

  private canvas: HTMLCanvasElement | null = null

  bind(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('pointerlockchange', this.onLock)
    canvas.addEventListener('click', this.onClick)
    window.addEventListener('blur', this.onBlur)
    window.addEventListener('gamepadconnected', () => undefined)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onLock)
    this.canvas?.removeEventListener('click', this.onClick)
    window.removeEventListener('blur', this.onBlur)
  }

  beginFrame(): void {
    this.pollGamepad()
  }

  endFrame(): void {
    this.mouseDX = 0
    this.mouseDY = 0
    this.interactPressed = false
    this.mountPressed = false
    this.jumpPressed = false
    this.pausePressed = false
    this.debugSkipPressed = false
    this.debugCollapsePressed = false
  }

  axis(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1
    const pad = this.readPad()
    if (pad) {
      x += pad.ax
      y += pad.ay
    }
    const mag = Math.hypot(x, y)
    if (mag > 1) {
      x /= mag
      y /= mag
    }
    return { x, y }
  }

  running(): boolean {
    return this.down('ShiftLeft') || this.down('ShiftRight') || this.padButton(4)
  }

  flyUp(): boolean {
    return this.down('Space') || this.padButton(5)
  }

  flyDown(): boolean {
    return this.down('ControlLeft') || this.down('ControlRight') || this.down('KeyX') || this.padButton(1)
  }

  climbingHeld(): boolean {
    return this.down('KeyC') || this.down('Space')
  }

  private down(code: string): boolean {
    return this.keys.has(code)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat && (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Escape')) return
    this.keys.add(e.code)
    if (e.code === 'KeyE') this.interactPressed = true
    if (e.code === 'KeyF') this.mountPressed = true
    if (e.code === 'Space') this.jumpPressed = true
    if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true
    if (e.code === 'F9') this.debugSkipPressed = true
    if (e.code === 'F10') this.debugCollapsePressed = true
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F9', 'F10'].includes(e.code)) {
      e.preventDefault()
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return
    this.mouseDX += e.movementX
    this.mouseDY += e.movementY
  }

  private onLock = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas
  }

  private onClick = (): void => {
    if (!this.pointerLocked) this.canvas?.requestPointerLock()
  }

  private onBlur = (): void => {
    this.keys.clear()
  }

  requestLock(): void {
    this.canvas?.requestPointerLock()
  }

  private pollGamepad(): void {
    const pad = this.readPad()
    if (!pad) return
    this.mouseDX += pad.rx * 18
    this.mouseDY += pad.ry * 18
    if (pad.pressed(0)) this.jumpPressed = true
    if (pad.pressed(2)) this.interactPressed = true
    if (pad.pressed(3)) this.mountPressed = true
    if (pad.pressed(9)) this.pausePressed = true
  }

  private padPrev = new Set<number>()

  private readPad():
    | {
        ax: number
        ay: number
        rx: number
        ry: number
        pressed: (i: number) => boolean
      }
    | null {
    const pads = navigator.getGamepads?.() ?? []
    const gp = pads[0]
    if (!gp) return null
    const dead = (v: number) => (Math.abs(v) < 0.18 ? 0 : v)
    const pressed = (i: number) => {
      const down = !!gp.buttons[i]?.pressed
      const was = this.padPrev.has(i)
      if (down) this.padPrev.add(i)
      else this.padPrev.delete(i)
      return down && !was
    }
    return {
      ax: dead(gp.axes[0] ?? 0),
      ay: -dead(gp.axes[1] ?? 0),
      rx: dead(gp.axes[2] ?? 0),
      ry: dead(gp.axes[3] ?? 0),
      pressed,
    }
  }

  private padButton(i: number): boolean {
    const gp = navigator.getGamepads?.()[0]
    return !!gp?.buttons[i]?.pressed
  }
}
