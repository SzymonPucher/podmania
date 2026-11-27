import type { MapDefinition, MapRecord, MedalTier, SaveData } from '../types';

const STORAGE_KEY = 'podmania_save_v1';

const MEDAL_RANK: Record<MedalTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export function compareMedals(a: MedalTier, b: MedalTier): number {
  return MEDAL_RANK[a] - MEDAL_RANK[b];
}

export class StorageManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  public getMapRecord(mapId: string): MapRecord {
    return (
      this.data.maps[mapId] ?? {
        bestTimeMs: null,
        bestScore: 0,
        bestMedal: 'none',
        checkpointSplitsMs: [],
      }
    );
  }

  public isMapUnlocked(map: MapDefinition): boolean {
    if (!map.unlockRequirement) return true;
    const reqRecord = this.getMapRecord(map.unlockRequirement.mapId);
    return compareMedals(reqRecord.bestMedal, map.unlockRequirement.minMedal) >= 0;
  }

  public recordRun(
    mapId: string,
    timeMs: number,
    score: number,
    medal: MedalTier,
    splitsMs: number[]
  ): { isNewPB: boolean; prevBestMedal: MedalTier } {
    const existing = this.getMapRecord(mapId);
    const prevBestMedal = existing.bestMedal;
    const isNewPB = existing.bestTimeMs === null || timeMs < existing.bestTimeMs;

    const updated: MapRecord = {
      bestTimeMs: isNewPB ? timeMs : existing.bestTimeMs,
      bestScore: Math.max(existing.bestScore, score),
      bestMedal: compareMedals(medal, existing.bestMedal) > 0 ? medal : existing.bestMedal,
      checkpointSplitsMs: isNewPB ? [...splitsMs] : existing.checkpointSplitsMs,
    };

    this.data.maps[mapId] = updated;
    this.save();
    return { isNewPB, prevBestMedal };
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { maps: {} };
      const parsed = JSON.parse(raw) as SaveData;
      if (!parsed || typeof parsed.maps !== 'object') return { maps: {} };
      return parsed;
    } catch {
      return { maps: {} };
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }
}
