import * as THREE from 'three'
import { GAME } from './config'
import type { Interactable } from './world'
import type { GameAudio } from './audio'

export type QuestId = 'lyra' | 'market' | 'chapel' | 'duke' | 'anchors'

export type DialogueChoice = {
  label: string
  run: () => void
}

export type Dialogue = {
  speaker: string
  text: string
  choices: DialogueChoice[]
}

export type QuestState = {
  id: QuestId
  title: string
  detail: string
  status: 'active' | 'done' | 'failed'
  flags: Record<string, boolean | number | string>
}

export type Outcome = {
  lyraSaved: boolean
  vendorsSaved: number
  vendorsPacked: number
  bellRung: boolean
  childrenSaved: number
  relicTaken: boolean
  staffSaved: number
  anchors: number
  escaped: boolean
  peopleHint: number
}

export class QuestSystem {
  quests: QuestState[] = []
  dialogue: Dialogue | null = null
  followId: string | null = null
  outcome: Outcome = {
    lyraSaved: false,
    vendorsSaved: 0,
    vendorsPacked: 0,
    bellRung: false,
    childrenSaved: 0,
    relicTaken: false,
    staffSaved: 0,
    anchors: 0,
    escaped: false,
    peopleHint: 0,
  }
  extraTime = 0
  log: string[] = []
  private audio: GameAudio

  constructor(audio: GameAudio) {
    this.audio = audio
    this.quests = [
      { id: 'lyra', title: '齒輪裡的餘燼', detail: '到工業底層找工頭凱爾', status: 'active', flags: {} },
      { id: 'market', title: '夜市離散', detail: '與商會主瑟拉會面', status: 'active', flags: { evacuated: 0, packed: 0 } },
      { id: 'chapel', title: '名字台地', detail: '到住居台地找祭司奧倫', status: 'active', flags: { kids: 0 } },
      { id: 'duke', title: '公爵的交易', detail: '到貴族庭園見公爵', status: 'active', flags: { staff: 0 } },
      { id: 'anchors', title: '星錨協議', detail: '登上觀星台見薇拉', status: 'active', flags: { n: 0 } },
    ]
  }

  interact(it: Interactable, playerPos: THREE.Vector3): boolean {
    if (this.dialogue) return true
    switch (it.id) {
      case 'npc-kael':
        return this.talkKael()
      case 'lyra':
        return this.talkLyra()
      case 'npc-sera':
        return this.talkSera()
      case 'vendor-0':
      case 'vendor-1':
      case 'vendor-2':
        return this.talkVendor(it.id)
      case 'npc-oren':
        return this.talkOren()
      case 'child-a':
      case 'child-b':
        return this.rescueChild(it.id)
      case 'bell':
        return this.ringBell()
      case 'npc-duke':
        return this.talkDuke()
      case 'relic':
        return this.takeRelic()
      case 'staff-0':
      case 'staff-1':
      case 'staff-2':
        return this.saveStaff(it.id)
      case 'npc-vela':
        return this.talkVela()
      case 'anchor-0':
      case 'anchor-1':
      case 'anchor-2':
        return this.activateAnchor(it.id)
      case 'ferry':
        return this.boardFerry()
      default:
        void playerPos
        return false
    }
  }

  tryDeliverLyra(playerPos: THREE.Vector3): void {
    const q = this.q('lyra')
    if (q.status !== 'active' || !q.flags.escort) return
    if (Math.hypot(playerPos.x - 110, playerPos.z - 20) < 10 && playerPos.y > 80 && playerPos.y < 100) {
      q.status = 'done'
      q.detail = '萊拉已送上渡輪'
      q.flags.escort = false
      this.followId = this.followId === 'lyra' ? null : this.followId
      this.outcome.lyraSaved = true
      this.outcome.peopleHint += 1
      this.push('你把萊拉送上了天空渡輪。工業升降臺在崩落時會多撐一會兒。')
    }
  }

  failRemaining(): void {
    for (const q of this.quests) {
      if (q.status === 'active') {
        q.status = 'failed'
        if (q.id === 'lyra' && !this.outcome.lyraSaved) q.detail = '鑄造廠在崩落中沉默了'
        if (q.id === 'chapel' && !this.outcome.bellRung) q.detail = '鐘從未響起'
      }
    }
  }

  summary(): string[] {
    const lines = [
      this.outcome.escaped ? '你活了下來。埃特里亞沒有。' : '天空吞沒了騎士。',
      this.outcome.lyraSaved ? '萊拉活著。她會記得齒輪停止的那一聲。' : '鑄造廠裡的孩子沒有出來。',
      `夜市：${this.outcome.vendorsSaved} 戶疏散，${this.outcome.vendorsPacked} 戶帶走貨物。`,
      this.outcome.bellRung
        ? `疏散鐘響了。找到的孩子：${this.outcome.childrenSaved}/2。`
        : '住居台地的名字，沒有被鐘聲叫醒。',
      this.outcome.relicTaken
        ? '星錨遺物在你身上。庭園會晚一點才傾覆。'
        : `庭園僕役獲救 ${this.outcome.staffSaved} 人。遺物沉入雲海。`,
      `啟動的星錨：${this.outcome.anchors}。`,
    ]
    return lines
  }

  private talkKael(): boolean {
    const q = this.q('lyra')
    if (q.flags.talked) {
      this.open('凱爾', q.flags.escort ? '快帶她去市集碼頭的渡輪！時間不夠了。' : '萊拉還在鑄造廠裡。門在東側。', [
        { label: '我這就去', run: () => this.close() },
      ])
      return true
    }
    this.open('工頭凱爾', '心輪卡住了。我女兒萊拉爬進去想鬆開棘輪——現在出不來。求你，天空騎士。把她帶上市集的渡輪。我留下守機。', [
      { label: '我去找她', run: () => {
        q.flags.talked = true
        q.detail = '進入鑄造廠，救出萊拉'
        this.push('新目標：進入工業底層的心輪鑄造廠。')
        this.close()
      } },
      { label: '我還有別的人要救', run: () => {
        q.flags.talked = true
        q.detail = '鑄造廠裡還有一個孩子（你還沒答應）'
        this.close()
      } },
    ])
    return true
  }

  private talkLyra(): boolean {
    const q = this.q('lyra')
    if (q.status === 'done') return false
    this.open('萊拉', '齒輪咬住我的袖子了……拜託，不要留下我。爸爸說渡輪在上面的市集。', [
      { label: '跟我走', run: () => {
        q.flags.escort = true
        q.detail = '護送萊拉到市集渡輪碼頭'
        this.followId = 'lyra'
        this.push('萊拉跟上了你。帶她到市集東側碼頭。')
        this.close()
      } },
      { label: '先等一等', run: () => this.close() },
    ])
    return true
  }

  private talkSera(): boolean {
    const q = this.q('market')
    this.open('商會主瑟拉', '午夜一到，棚架會先掉進雲裡。三戶還在猶豫：要人，還是要一輩子的貨物？你幫他們決定。夜攤會在更晚才出來——那又是另一批命。', [
      { label: '我去各攤走一趟', run: () => {
        q.detail = '勸三戶疏散，或幫他們打包（更慢）'
        this.close()
      } },
    ])
    return true
  }

  private talkVendor(id: string): boolean {
    const q = this.q('market')
    if (q.flags[id] === 'gone' || q.flags[id] === 'packed') {
      this.open('攤販', '我們聽你的了。謝謝。', [{ label: '保重', run: () => this.close() }])
      return true
    }
    this.open('攤販家族', '渡輪座位有限。空手走，今晚能活；把貨打包，也許明天還能吃飯——但要多花時間。', [
      { label: '現在就走，留下貨物', run: () => {
        q.flags[id] = 'gone'
        q.flags.evacuated = Number(q.flags.evacuated) + 1
        this.outcome.vendorsSaved += 1
        this.outcome.peopleHint += 4
        this.refreshMarket(q)
        this.close()
      } },
      { label: '我幫你們打包（消耗時間）', run: () => {
        q.flags[id] = 'packed'
        q.flags.packed = Number(q.flags.packed) + 1
        this.outcome.vendorsPacked += 1
        this.outcome.peopleHint += 4
        this.extraTime -= 25
        this.refreshMarket(q)
        this.close()
      } },
    ])
    return true
  }

  private refreshMarket(q: QuestState): void {
    const n = Number(q.flags.evacuated) + Number(q.flags.packed)
    q.detail = `已處理 ${n}/3 戶（疏散 ${String(q.flags.evacuated)}／打包 ${String(q.flags.packed)}）`
    if (n >= 3) {
      q.status = 'done'
      q.detail = '三戶都已做出選擇'
      this.push('夜市的選擇已經定案。沒被點名的人，午夜後自求多福。')
    }
  }

  private talkOren(): boolean {
    const q = this.q('chapel')
    this.open('祭司奧倫', '鐘一響，老人會往渡輪走。可還有兩個孩子沒回來——彌在西台，諾跟去了市集。現在敲鐘，有人會被留下。等孩子，鐘就可能太晚。', [
      { label: '我先找孩子', run: () => {
        q.detail = '找到彌與諾，再回來敲鐘'
        this.close()
      } },
      { label: '我去敲鐘', run: () => this.close() },
    ])
    return true
  }

  private rescueChild(id: string): boolean {
    const q = this.q('chapel')
    if (q.flags[id]) {
      this.open('孩子', '我會跟著人群走。', [{ label: '好', run: () => this.close() }])
      return true
    }
    this.open(id === 'child-a' ? '彌' : '諾', '我找不到回家的路……鐘還沒響。你能帶我認路嗎？', [
      { label: '跟祭司的人走，快', run: () => {
        q.flags[id] = true
        q.flags.kids = Number(q.flags.kids) + 1
        this.outcome.childrenSaved += 1
        this.outcome.peopleHint += 1
        q.detail = `已找到孩子 ${String(q.flags.kids)}/2。回去敲鐘。`
        this.push('孩子被送往禮拜堂方向。')
        this.close()
      } },
    ])
    return true
  }

  private ringBell(): boolean {
    const q = this.q('chapel')
    if (q.flags.rung) return false
    const kids = Number(q.flags.kids)
    this.open('疏散鐘', kids < 2
      ? `還有 ${2 - kids} 個孩子沒找到。現在敲鐘，老人會走，孩子可能永遠留在台地。`
      : '兩個孩子都回來了。敲鐘吧。', [
      { label: '敲鐘', run: () => {
        q.flags.rung = true
        q.status = 'done'
        this.outcome.bellRung = true
        this.outcome.peopleHint += kids < 2 ? 8 : 12
        q.detail = kids < 2 ? `鐘響了。${kids}/2 孩子獲救` : '鐘響了。孩子都在。'
        this.push('鐘聲穿過五層城區。有人開始跑。有人還在睡。')
        this.close()
      } },
      { label: '再等一等', run: () => this.close() },
    ])
    return true
  }

  private talkDuke(): boolean {
    const q = this.q('duke')
    if (q.flags.chose) {
      this.open('公爵', this.outcome.relicTaken ? '拿著遺物。庭園會多謝你——僕役則不會。' : '僕役會記得你。石頭不會。', [
        { label: '……', run: () => this.close() },
      ])
      return true
    }
    this.open('公爵奧德里奇', '星錨遺物能讓庭園在崩落裡多撐一口氣。或者你帶我的人走。不能兩全。這是貴族最後的誠實。', [
      { label: '拿遺物（庭園較晚崩）', run: () => {
        q.flags.chose = true
        q.detail = '從大廳取得星錨遺物'
        this.close()
      } },
      { label: '救僕役（遺物留下）', run: () => {
        q.flags.chose = true
        q.flags.staffPath = true
        q.detail = '通知庭園裡的三名僕役撤離'
        this.close()
      } },
    ])
    return true
  }

  private takeRelic(): boolean {
    const q = this.q('duke')
    if (this.outcome.relicTaken || q.flags.staffPath) {
      this.open('星錨遺物', q.flags.staffPath ? '你已經把機會給了人。遺物鎖死了。' : '它在你的腰帶上發燙。', [
        { label: '離開', run: () => this.close() },
      ])
      return true
    }
    this.outcome.relicTaken = true
    q.status = 'done'
    q.detail = '取得遺物。僕役被留下。'
    this.push('遺物入手。庭園的石頭會晚一點才背叛你。')
    this.close()
    this.open('星錨遺物', '黃銅裡有心跳。你選了城，沒選人。', [{ label: '收好', run: () => this.close() }])
    return true
  }

  private saveStaff(id: string): boolean {
    const q = this.q('duke')
    if (!q.flags.staffPath) {
      this.open('僕役', '沒有公爵的令，我們不能丟下噴泉。去大廳。', [{ label: '明白', run: () => this.close() }])
      return true
    }
    if (q.flags[id]) return false
    q.flags[id] = true
    q.flags.staff = Number(q.flags.staff) + 1
    this.outcome.staffSaved += 1
    this.outcome.peopleHint += 2
    q.detail = `僕役撤離 ${String(q.flags.staff)}/3`
    if (Number(q.flags.staff) >= 3) {
      q.status = 'done'
      q.detail = '僕役已走。遺物留在廳裡。'
      this.push('庭園的人開始往下跑。噴泉還在唱。')
    }
    this.open('僕役', '我們走。謝謝你沒把我們算成裝飾。', [{ label: '快去碼頭', run: () => this.close() }])
    return true
  }

  private talkVela(): boolean {
    const q = this.q('anchors')
    this.open('皇家星官薇拉', `城靠三座星錨吊在氣流上。啟動一座，崩落延後 ${GAME.anchorBonusSec} 秒。東、西臺各一座；第三座鏽在工業底層，幾乎沒人記得。你沒時間全做完——除非你放棄別人。`, [
      { label: '告訴我控制臺在哪', run: () => {
        q.detail = '啟動星錨控制臺（觀星臺東西側，以及底層）'
        this.close()
      } },
    ])
    return true
  }

  private activateAnchor(id: string): boolean {
    const q = this.q('anchors')
    if (q.flags[id]) {
      this.open('星錨', '這座已經咬住氣流了。', [{ label: '好', run: () => this.close() }])
      return true
    }
    q.flags[id] = true
    q.flags.n = Number(q.flags.n) + 1
    this.outcome.anchors += 1
    this.extraTime += GAME.anchorBonusSec
    q.detail = `已啟動 ${String(q.flags.n)}/3 座星錨（+${this.outcome.anchors * GAME.anchorBonusSec}s）`
    if (Number(q.flags.n) >= 2) q.status = 'done'
    this.push(`星錨啟動。午夜被往後推了 ${GAME.anchorBonusSec} 秒。`)
    this.open('星錨控制臺', '黃銅針彈回。雲海像被刺了一下。你偷到了一點時間——從別人那裡。', [
      { label: '繼續', run: () => this.close() },
    ])
    return true
  }

  private boardFerry(): boolean {
    this.open('天空渡輪', '現在上船等於拋下還在城裡的人。崩落開始後，它會是最後的路——除非你騎嵐羽衝出雲層。', [
      { label: '現在不走', run: () => this.close() },
    ])
    return true
  }

  escapeOnFerry(): void {
    this.outcome.escaped = true
    this.push('渡輪切斷纜繩。埃特里亞在你腳下折斷。')
  }

  escapeOnMount(): void {
    this.outcome.escaped = true
    this.push('嵐羽穿過崩碎的橋。下面是雲，上面是沒有城的天。')
  }

  q(id: QuestId): QuestState {
    return this.quests.find((q) => q.id === id)!
  }

  private open(speaker: string, text: string, choices: DialogueChoice[]): void {
    this.dialogue = { speaker, text, choices }
    this.audio.interact()
  }

  private close(): void {
    this.dialogue = null
  }

  private push(line: string): void {
    this.log.unshift(line)
    this.log = this.log.slice(0, 6)
    this.audio.quest()
  }
}
