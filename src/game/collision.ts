export type ColliderKind = 'solid' | 'floor' | 'climb' | 'trigger'

export type Box = {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
  kind: ColliderKind
  id?: string
  enabled: boolean
  maxRadius?: number
}

export function box(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  kind: ColliderKind = 'solid',
  id?: string,
): Box {
  const hw = w * 0.5
  const hd = d * 0.5
  return {
    minX: x - hw,
    maxX: x + hw,
    minY: y,
    maxY: y + h,
    minZ: z - hd,
    maxZ: z + hd,
    kind,
    id,
    enabled: true,
  }
}

export class CollisionWorld {
  boxes: Box[] = []

  add(b: Box): Box {
    this.boxes.push(b)
    return b
  }

  addFloor(x: number, y: number, z: number, w: number, d: number, h = 0.6, id?: string): Box {
    return this.add(box(x, y - h, z, w, h, d, 'floor', id))
  }

  disableId(id: string): void {
    for (const b of this.boxes) {
      if (b.id === id) b.enabled = false
    }
  }

  groundY(x: number, y: number, z: number, maxDrop = 3.2): number | null {
    let best: number | null = null
    const top = y + 0.15
    const bottom = y - maxDrop
    for (const b of this.boxes) {
      if (!b.enabled || (b.kind !== 'floor' && b.kind !== 'solid')) continue
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue
      if (b.maxRadius !== undefined && Math.hypot(x, z) > b.maxRadius) continue
      if (b.maxY <= top + 0.35 && b.maxY >= bottom) {
        if (best === null || b.maxY > best) best = b.maxY
      }
    }
    return best
  }

  resolve(
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
  ): { x: number; y: number; z: number; grounded: boolean; climb: Box | null } {
    let gx = x
    let gy = y
    let gz = z
    let climb: Box | null = null

    for (let pass = 0; pass < 3; pass++) {
      for (const b of this.boxes) {
        if (!b.enabled || b.kind === 'trigger' || b.kind === 'floor') continue
        const nearestX = Math.max(b.minX, Math.min(gx, b.maxX))
        const nearestZ = Math.max(b.minZ, Math.min(gz, b.maxZ))
        const dx = gx - nearestX
        const dz = gz - nearestZ
        const dist = Math.hypot(dx, dz)
        const feet = gy
        const head = gy + height
        const overlapY = feet < b.maxY && head > b.minY
        if (!overlapY) continue
        if (dist < radius && dist > 1e-5) {
          const push = (radius - dist) / dist
          gx += dx * push
          gz += dz * push
          if (b.kind === 'climb') climb = b
        } else if (dist <= 1e-5 && gx >= b.minX - radius && gx <= b.maxX + radius && gz >= b.minZ - radius && gz <= b.maxZ + radius) {
          const left = Math.abs(gx - b.minX)
          const right = Math.abs(b.maxX - gx)
          const near = Math.abs(gz - b.minZ)
          const far = Math.abs(b.maxZ - gz)
          const m = Math.min(left, right, near, far)
          if (m === left) gx = b.minX - radius
          else if (m === right) gx = b.maxX + radius
          else if (m === near) gz = b.minZ - radius
          else gz = b.maxZ + radius
          if (b.kind === 'climb') climb = b
        }
      }
    }

    const ground = this.groundY(gx, gy + 0.35, gz, 2.4)
    let grounded = false
    if (ground !== null && gy <= ground + 0.12) {
      gy = ground
      grounded = true
    }

    return { x: gx, y: gy, z: gz, grounded, climb }
  }

  queryTrigger(x: number, y: number, z: number, radius: number): Box | null {
    for (const b of this.boxes) {
      if (!b.enabled || b.kind !== 'trigger') continue
      if (x + radius < b.minX || x - radius > b.maxX) continue
      if (z + radius < b.minZ || z - radius > b.maxZ) continue
      if (y + 1.6 < b.minY || y > b.maxY) continue
      return b
    }
    return null
  }
}
