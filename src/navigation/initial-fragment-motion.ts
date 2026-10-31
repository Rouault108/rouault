export const INITIAL_FRAGMENT_TOLERANCE_PX = 2;

export interface InitialFragmentGeometry {
  readonly identity: object | string;
  readonly values: readonly number[];
  readonly motionRevision: number;
}

export interface InitialFragmentGeometryResult {
  readonly stable: boolean;
  readonly revision: number;
}

const sameGeometryIdentity = (
  first: InitialFragmentGeometry,
  second: InitialFragmentGeometry,
): boolean =>
  first.identity === second.identity &&
  first.motionRevision === second.motionRevision &&
  first.values.length === second.values.length;

const nearValues = (first: readonly number[], second: readonly number[]): boolean =>
  first.length === second.length &&
  first.every(
    (value, index) =>
      Math.abs(value - (second[index] ?? Number.NaN)) <= INITIAL_FRAGMENT_TOLERANCE_PX,
  );

const finiteGeometry = (geometry: InitialFragmentGeometry): boolean =>
  geometry.values.length > 0 &&
  geometry.values.every(Number.isFinite) &&
  Number.isFinite(geometry.motionRevision);

const withinSpan = (samples: readonly InitialFragmentGeometry[]): boolean =>
  (samples[0]?.values ?? []).every((_, index) => {
    const values = samples.map((sample) => sample.values[index] ?? Number.NaN);
    return Math.max(...values) - Math.min(...values) <= INITIAL_FRAGMENT_TOLERANCE_PX;
  });

const copyGeometry = (geometry: InitialFragmentGeometry): InitialFragmentGeometry => ({
  ...geometry,
  values: [...geometry.values],
});

export class InitialFragmentGeometryWindow {
  private anchor: InitialFragmentGeometry | null = null;
  private samples: InitialFragmentGeometry[] = [];
  private adopted: InitialFragmentGeometry | null = null;
  private revision = 0;

  resetWindow(): void {
    this.anchor = null;
    this.samples = [];
  }

  observe(geometry: InitialFragmentGeometry): InitialFragmentGeometryResult {
    if (!finiteGeometry(geometry)) {
      this.resetWindow();
      return { stable: false, revision: this.revision };
    }
    const sample = copyGeometry(geometry);
    const next = [...this.samples, sample].slice(-3);
    if (
      !this.anchor ||
      !sameGeometryIdentity(this.anchor, sample) ||
      !nearValues(this.anchor.values, sample.values) ||
      !withinSpan(next)
    ) {
      this.anchor = sample;
      this.samples = [sample];
    } else this.samples = next;
    if (this.samples.length < 3) return { stable: false, revision: this.revision };
    // 採用前の旧geometryとの差はwindowのreset条件にしない。
    if (
      this.adopted?.identity !== sample.identity ||
      !nearValues(this.adopted.values, sample.values)
    ) {
      this.adopted = copyGeometry(sample);
      this.revision += 1;
    }
    return { stable: true, revision: this.revision };
  }

  matches(geometry: InitialFragmentGeometry): boolean {
    return (
      finiteGeometry(geometry) &&
      this.samples.length === 3 &&
      this.anchor !== null &&
      sameGeometryIdentity(this.anchor, geometry) &&
      nearValues(this.anchor.values, geometry.values) &&
      withinSpan([...this.samples, geometry])
    );
  }
}

export const sameInitialFragmentPoint = (
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): boolean =>
  [first.x, first.y, second.x, second.y].every(Number.isFinite) &&
  Math.abs(first.x - second.x) <= INITIAL_FRAGMENT_TOLERANCE_PX &&
  Math.abs(first.y - second.y) <= INITIAL_FRAGMENT_TOLERANCE_PX;
