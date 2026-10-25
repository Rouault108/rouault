export interface FragmentGeometry {
  readonly documentY: number;
  readonly offset: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly rangeX: number;
  readonly rangeY: number;
  readonly targetX: number;
  readonly targetY: number;
}

export interface FragmentObservation {
  readonly at: number;
  readonly x: number;
  readonly y: number;
  readonly geometry: FragmentGeometry;
  readonly ready: boolean;
  readonly visible: boolean;
}

export const FRAGMENT_DEADLINE_MS = 5000;
export const FRAGMENT_FRAME_GAP_MS = 50;
export const FRAGMENT_VERIFICATION_MS = 200;

export interface FragmentCorrectionPlan {
  readonly startX: number;
  readonly startY: number;
  readonly geometry: FragmentGeometry;
  readonly startedAt: number;
  readonly deadline: number;
  readonly duration: number;
}

export const planFragmentCorrection = (
  observation: FragmentObservation,
  deadline: number,
  reducedMotion: boolean,
): FragmentCorrectionPlan | null => {
  if (
    !observation.ready ||
    !observation.visible ||
    !Number.isFinite(observation.at) ||
    !Number.isFinite(deadline) ||
    !sameFragmentGeometry(observation.geometry, observation.geometry) ||
    !Number.isFinite(observation.x) ||
    !Number.isFinite(observation.y)
  )
    return null;
  const distance = Math.hypot(
    observation.geometry.targetX - observation.x,
    observation.geometry.targetY - observation.y,
  );
  const duration = reducedMotion
    ? 0
    : 1000 * Math.max(0.18, (1.875 * distance) / 800, Math.sqrt((5.773503 * distance) / 4000));
  if (!Number.isFinite(duration) || observation.at + duration + 500 + 50 > deadline) return null;
  return {
    startX: observation.x,
    startY: observation.y,
    geometry: { ...observation.geometry },
    startedAt: observation.at,
    deadline,
    duration,
  };
};

type FragmentCorrectionStep =
  | { readonly kind: 'aborted'; readonly reason: string }
  | { readonly kind: 'step'; readonly x: number; readonly y: number; readonly done: boolean };

// 原点・終点を固定した一回の軌道。実座標の外乱を次の原点へ取り込まない。
export class FragmentCorrectionTrajectory {
  private previousAt: number;
  private previousX: number;
  private previousY: number;
  private expectedX: number;
  private expectedY: number;
  private drift = 0;

  constructor(readonly plan: FragmentCorrectionPlan) {
    this.previousAt = plan.startedAt;
    this.previousX = this.expectedX = plan.startX;
    this.previousY = this.expectedY = plan.startY;
  }

  next(value: FragmentObservation): FragmentCorrectionStep {
    if (!Number.isFinite(value.at) || !Number.isFinite(value.x) || !Number.isFinite(value.y))
      return { kind: 'aborted', reason: 'external-motion' };
    const gap = value.at - this.previousAt;
    if (value.at >= this.plan.deadline) return { kind: 'aborted', reason: 'deadline' };
    if (gap > FRAGMENT_FRAME_GAP_MS || gap < 0) return { kind: 'aborted', reason: 'frame-gap' };
    if (!value.ready || !value.visible || !sameFragmentGeometry(value.geometry, this.plan.geometry))
      return { kind: 'aborted', reason: 'geometry' };
    this.drift += Math.hypot(value.x - this.previousX, value.y - this.previousY);
    if (
      this.drift > 1 ||
      Math.abs(value.x - this.expectedX) > 1 ||
      Math.abs(value.y - this.expectedY) > 1
    )
      return { kind: 'aborted', reason: 'external-motion' };
    const u =
      this.plan.duration === 0
        ? 1
        : Math.min(1, Math.max(0, (value.at - this.plan.startedAt) / this.plan.duration));
    const s = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
    this.expectedX = this.plan.startX + (this.plan.geometry.targetX - this.plan.startX) * s;
    this.expectedY = this.plan.startY + (this.plan.geometry.targetY - this.plan.startY) * s;
    this.previousAt = value.at;
    return { kind: 'step', x: this.expectedX, y: this.expectedY, done: u === 1 };
  }

  written(x: number, y: number): boolean {
    this.previousX = x;
    this.previousY = y;
    return Math.abs(x - this.expectedX) <= 1 && Math.abs(y - this.expectedY) <= 1;
  }
}

export const sameFragmentGeometry = (a: FragmentGeometry, b: FragmentGeometry): boolean =>
  (Object.keys(a) as (keyof FragmentGeometry)[]).every(
    (key) => Number.isFinite(a[key]) && Number.isFinite(b[key]) && Math.abs(a[key] - b[key]) <= 1,
  );

// 固定窓との比較により、隣接frameの小さい変化を累積して見逃さない。
// 静止候補はnativeの完了証明ではなく、受理後も別の窓で検証する。
export class FragmentQuietWindow {
  private baseline: FragmentObservation | null = null;
  private previousAt: number | null = null;
  private observations = 0;
  private endHint: number | null = null;

  constructor(private readonly verification = false) {}

  hint(at: number): void {
    if (this.baseline && at >= this.baseline.at) this.endHint = at;
  }

  reset(): void {
    this.baseline = null;
    this.previousAt = null;
    this.observations = 0;
    this.endHint = null;
  }

  observe(value: FragmentObservation): boolean {
    const gap = this.previousAt === null ? 0 : value.at - this.previousAt;
    this.previousAt = value.at;
    if (
      !value.visible ||
      !value.ready ||
      !Number.isFinite(value.at) ||
      !Number.isFinite(value.x) ||
      !Number.isFinite(value.y) ||
      gap > FRAGMENT_FRAME_GAP_MS ||
      gap < 0
    ) {
      this.reset();
      return false;
    }
    if (
      value.x !== this.baseline?.x ||
      value.y !== this.baseline.y ||
      !sameFragmentGeometry(value.geometry, this.baseline.geometry)
    ) {
      this.baseline = value;
      this.observations = 1;
      this.endHint = null;
      return false;
    }
    // 同じ時刻の再照会を独立したRAF観測として数えない。
    if (gap > 0) this.observations += 1;
    const duration = this.verification || this.endHint === null ? FRAGMENT_VERIFICATION_MS : 100;
    return this.observations >= 3 && value.at - this.baseline.at >= duration;
  }
}
