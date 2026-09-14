export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private windGain: GainNode | null = null
  muted = false

  ensure(): void {
    if (this.ctx) return
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.startWind()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 0.22
  }

  setWind(intensity: number): void {
    if (!this.windGain || !this.ctx) return
    const t = this.ctx.currentTime
    this.windGain.gain.setTargetAtTime(0.03 + intensity * 0.12, t, 0.4)
  }

  tone(freq: number, dur = 0.12, type: OscillatorType = 'sine', vol = 0.2): void {
    if (!this.ctx || !this.master || this.muted) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(vol, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop(this.ctx.currentTime + dur)
  }

  interact(): void {
    this.tone(520, 0.08, 'triangle', 0.15)
    this.tone(780, 0.1, 'sine', 0.08)
  }

  quest(): void {
    this.tone(392, 0.16, 'triangle', 0.16)
    this.tone(523, 0.22, 'sine', 0.1)
    this.tone(659, 0.28, 'sine', 0.1)
  }

  danger(): void {
    this.tone(110, 0.4, 'sawtooth', 0.12)
  }

  land(): void {
    this.tone(90, 0.08, 'square', 0.05)
  }

  tick(): void {
    this.tone(880, 0.04, 'square', 0.04)
  }

  private startWind(): void {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const g = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 48
    filter.type = 'lowpass'
    filter.frequency.value = 180
    g.gain.value = 0.04
    osc.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    osc.start()
    this.windGain = g
  }
}
