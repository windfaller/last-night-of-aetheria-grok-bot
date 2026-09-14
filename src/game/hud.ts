import { DISTRICTS, GAME, districtAtY } from './config'
import type { QuestSystem } from './quests'
import type { MoveState } from './player'

export class HUD {
  readonly root: HTMLElement
  private clockEl: HTMLElement
  private countEl: HTMLElement
  private districtEl: HTMLElement
  private stackEl: HTMLElement
  private questsEl: HTMLElement
  private promptEl: HTMLElement
  private logEl: HTMLElement
  private dialogueEl: HTMLElement
  private toastEl: HTMLElement
  private stateEl: HTMLElement
  private titleEl: HTMLElement
  private endEl: HTMLElement
  private pauseEl: HTMLElement

  constructor(app: HTMLElement) {
    app.innerHTML = `
      <canvas id="view"></canvas>
      <div id="hud" class="hidden">
        <div class="topbar">
          <div class="district-card">
            <div class="kicker">所在城區</div>
            <div id="district-name">市集區</div>
            <div id="district-en">Market District</div>
          </div>
          <div class="clock-card">
            <div class="kicker">埃特里亞官方時辰</div>
            <div id="clock">23:40</div>
            <div id="countdown">崩落倒數 20:00</div>
          </div>
          <div class="state-card">
            <div class="kicker">騎士狀態</div>
            <div id="move-state">步行</div>
            <div id="mount-hint">F 召喚嵐羽</div>
          </div>
        </div>
        <div class="stack" id="stack"></div>
        <div class="quests" id="quests"></div>
        <div class="log" id="log"></div>
        <div class="prompt" id="prompt"></div>
        <div class="help-chip">WASD 移動 · Shift 跑 · 空白鍵跳 · C 攀爬 · E 互動 · F 坐騎 · 滑鼠視角 · Esc 暫停</div>
      </div>
      <div id="dialogue" class="hidden"></div>
      <div id="toast"></div>
      <div id="title-screen">
        <div class="veil"></div>
        <div class="title-inner">
          <p class="edition">${GAME.edition}</p>
          <h1>${GAME.titleZh}</h1>
          <p class="en">${GAME.titleEn}</p>
          <p class="lead">浮空城將在午夜墜入雲海。你是女天空騎士。你有大約二十分鐘——救不了所有人。</p>
          <ul class="bullets">
            <li>五層城區垂直相疊，幾乎每處戶外都能看見你以後走得到的地方</li>
            <li>數條任務同時進行，選擇不可逆</li>
            <li>午夜時城會在可玩空間裡真正斷裂，你必須沿熟悉的路逃脫</li>
          </ul>
          <div class="title-actions">
            <button id="btn-start" type="button">開始最後一夜</button>
            <button id="btn-how" type="button" class="ghost">操作說明</button>
          </div>
          <p class="fine" id="how-panel" hidden>
            鍵盤：WASD / 方向鍵移動，Shift 奔跑，空白鍵跳躍（攀爬時也可上爬），C 貼著藤蔓或管線攀爬，
            E 互動、進建築、搭升降臺，F 召喚或降落坐騎嵐羽（空白鍵上升、Ctrl 下降）。
            手把：左搖桿走、右搖桿看、A 跳、X 互動、Y 坐騎、LB 跑。
            除錯：F9 快轉兩分鐘，F10 立刻崩落。
          </p>
        </div>
      </div>
      <div id="pause" class="hidden">
        <div class="panel">
          <h2>短暫歇息</h2>
          <p>官方時鐘暫停。合上這頁，午夜會繼續逼近。</p>
          <button id="btn-resume" type="button">繼續</button>
        </div>
      </div>
      <div id="ending" class="hidden">
        <div class="panel wide">
          <p class="edition">${GAME.edition}</p>
          <h2 id="end-title">雲上的判決</h2>
          <div id="end-body"></div>
          <button id="btn-again" type="button">再活一次（重新載入）</button>
        </div>
      </div>
    `
    this.root = app
    this.clockEl = must('#clock')
    this.countEl = must('#countdown')
    this.districtEl = must('#district-name')
    this.stackEl = must('#stack')
    this.questsEl = must('#quests')
    this.promptEl = must('#prompt')
    this.logEl = must('#log')
    this.dialogueEl = must('#dialogue')
    this.toastEl = must('#toast')
    this.stateEl = must('#move-state')
    this.titleEl = must('#title-screen')
    this.endEl = must('#ending')
    this.pauseEl = must('#pause')

    must('#btn-how').addEventListener('click', () => {
      const p = must('#how-panel')
      p.hidden = !p.hidden
    })
    must('#btn-again').addEventListener('click', () => location.reload())
  }

  onStart(fn: () => void): void {
    must('#btn-start').addEventListener('click', fn)
  }

  onResume(fn: () => void): void {
    must('#btn-resume').addEventListener('click', fn)
  }

  hideTitle(): void {
    this.titleEl.classList.add('hidden')
    must('#hud').classList.remove('hidden')
  }

  setPaused(paused: boolean): void {
    this.pauseEl.classList.toggle('hidden', !paused)
  }

  showEnding(title: string, lines: string[]): void {
    must('#hud').classList.add('hidden')
    this.endEl.classList.remove('hidden')
    must('#end-title').textContent = title
    must('#end-body').innerHTML = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')
  }

  render(
    elapsed: number,
    deadline: number,
    playerY: number,
    state: MoveState,
    mounted: boolean,
    quests: QuestSystem,
    prompt: string,
    collapsing: boolean,
    collapseT: number,
  ): void {
    const remain = Math.max(0, deadline - elapsed)
    const clock = gameClock(elapsed)
    this.clockEl.textContent = collapsing ? '午夜' : clock
    this.countEl.textContent = collapsing
      ? `逃脫窗口 ${fmt(Math.max(0, GAME.collapseEscapeSec - collapseT))}`
      : `崩落倒數 ${fmt(remain)}`
    this.clockEl.classList.toggle('danger', remain < 120 || collapsing)

    const d = districtAtY(playerY)
    this.districtEl.textContent = d.nameZh
    must('#district-en').textContent = d.nameEn

    this.stackEl.innerHTML = DISTRICTS.map((x) => {
      const here = x.id === d.id
      return `<div class="${here ? 'here' : ''}"><span>${here ? '●' : '○'}</span>${x.nameZh}</div>`
    }).reverse().join('')

    const labels: Record<MoveState, string> = {
      walk: '步行',
      climb: '攀爬',
      elevator: '升降臺',
      fly: '飛行',
      interior: '室內',
    }
    this.stateEl.textContent = mounted ? '騎乘嵐羽' : labels[state]
    must('#mount-hint').textContent = mounted ? 'F 降落（需靠近地面）' : 'F 召喚嵐羽'

    this.questsEl.innerHTML = `<div class="kicker">同時進行的委託</div>` + quests.quests.map((q) => {
      const st = q.status === 'done' ? 'done' : q.status === 'failed' ? 'fail' : 'live'
      return `<div class="q ${st}"><b>${escapeHtml(q.title)}</b><span>${escapeHtml(q.detail)}</span></div>`
    }).join('')

    this.logEl.innerHTML = quests.log.map((l) => `<div>${escapeHtml(l)}</div>`).join('')
    this.promptEl.textContent = prompt
    this.promptEl.classList.toggle('hidden', !prompt)

    if (quests.dialogue) {
      this.dialogueEl.classList.remove('hidden')
      const dlg = quests.dialogue
      this.dialogueEl.innerHTML = `<div class="dlg"><p class="who">${escapeHtml(dlg.speaker)}</p><p>${escapeHtml(dlg.text)}</p><div class="choices"></div></div>`
      const box = this.dialogueEl.querySelector('.choices')!
      dlg.choices.forEach((c, i) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = `${i + 1}. ${c.label}`
        b.addEventListener('click', () => c.run())
        box.appendChild(b)
      })
    } else {
      this.dialogueEl.classList.add('hidden')
      this.dialogueEl.innerHTML = ''
    }
  }

  toast(text: string): void {
    this.toastEl.textContent = text
    this.toastEl.classList.add('show')
    window.setTimeout(() => this.toastEl.classList.remove('show'), 2800)
  }
}

function gameClock(elapsed: number): string {
  const start = GAME.startHour * 3600 + GAME.startMin * 60
  const t = start + elapsed
  const h = Math.floor(t / 3600) % 24
  const m = Math.floor((t % 3600) / 60)
  return `${pad(h)}:${pad(m)}`
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function must(sel: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(sel)
  if (!el) throw new Error(sel)
  return el
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
