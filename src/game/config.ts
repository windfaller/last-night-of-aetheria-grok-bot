export const PORT_HINT = 4731

export const GAME = {
  titleZh: '天空城最後一夜',
  titleEn: 'Last Night of Aetheria',
  edition: 'Grok Bot version',
  durationSec: 20 * 60,
  startHour: 23,
  startMin: 40,
  collapseEscapeSec: 150,
  anchorBonusSec: 90,
  cityRadius: 220,
  cell: 18,
}

export type DistrictId =
  | 'industrial'
  | 'market'
  | 'residential'
  | 'gardens'
  | 'observatory'

export type Palette = {
  stone: number
  accent: number
  trim: number
  light: number
  fog: number
  under: number
}

export type DistrictDef = {
  id: DistrictId
  y: number
  thickness: number
  nameZh: string
  nameEn: string
  palette: Palette
}

export const DISTRICTS: DistrictDef[] = [
  {
    id: 'industrial',
    y: 12,
    thickness: 14,
    nameZh: '工業底層',
    nameEn: 'Industrial Underside',
    palette: {
      stone: 0x7a5644,
      accent: 0xd4843a,
      trim: 0x8a6248,
      light: 0xff8a40,
      fog: 0x3a2218,
      under: 0x4a3228,
    },
  },
  {
    id: 'market',
    y: 86,
    thickness: 10,
    nameZh: '市集區',
    nameEn: 'Market District',
    palette: {
      stone: 0xb87440,
      accent: 0xffc04a,
      trim: 0xc43a62,
      light: 0xffd878,
      fog: 0x4a2818,
      under: 0x7a4a28,
    },
  },
  {
    id: 'residential',
    y: 162,
    thickness: 10,
    nameZh: '住居台地',
    nameEn: 'Residential Terraces',
    palette: {
      stone: 0xe4d0b4,
      accent: 0xe07048,
      trim: 0x5a8a58,
      light: 0xffe8b8,
      fog: 0x382818,
      under: 0xb08a68,
    },
  },
  {
    id: 'gardens',
    y: 236,
    thickness: 10,
    nameZh: '貴族庭園',
    nameEn: 'Aristocratic Gardens',
    palette: {
      stone: 0xf4eee4,
      accent: 0xe8c04a,
      trim: 0x3d6a48,
      light: 0xfff6d0,
      fog: 0x283040,
      under: 0xd0c8bc,
    },
  },
  {
    id: 'observatory',
    y: 312,
    thickness: 12,
    nameZh: '王室觀星台',
    nameEn: 'Royal Observatory',
    palette: {
      stone: 0x3a4e78,
      accent: 0xe0b83a,
      trim: 0x7a58b0,
      light: 0x9ae0f2,
      fog: 0x182038,
      under: 0x2a3858,
    },
  },
]

export const MOVE = {
  walk: 5.6,
  run: 9.8,
  jump: 11.2,
  gravity: 24,
  airAccel: 10,
  groundAccel: 48,
  climb: 3.6,
  fly: 22,
  flyBoost: 34,
  flyUp: 14,
  radius: 0.42,
  height: 1.72,
}

export function districtAtY(y: number): DistrictDef {
  let best = DISTRICTS[0]
  let bestDist = Infinity
  for (const d of DISTRICTS) {
    const dist = Math.abs(y - (d.y + 4))
    if (dist < bestDist) {
      bestDist = dist
      best = d
    }
  }
  return best
}
