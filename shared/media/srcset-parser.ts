export interface SrcsetCandidate {
  readonly url: string;
  readonly descriptors: readonly string[];
}

export type SrcsetParseErrorReason = 'empty-srcset' | 'empty-candidate' | 'missing-url';

export type SrcsetParseResult =
  | {
      readonly ok: true;
      readonly candidates: readonly SrcsetCandidate[];
    }
  | {
      readonly ok: false;
      readonly reason: SrcsetParseErrorReason;
    };

const splitSrcsetCandidates = (value: string): readonly string[] => {
  const candidates: string[] = [];
  let current = '';
  let dataUrlPayloadDelimiterSeen = false;

  for (const character of value) {
    if (character === ',') {
      const normalizedCurrent = current.trim().toLowerCase();
      if (normalizedCurrent.startsWith('data:') && !dataUrlPayloadDelimiterSeen) {
        current += character;
        dataUrlPayloadDelimiterSeen = true;
        continue;
      }

      const candidate = current.trim();
      if (candidate.length > 0) {
        candidates.push(candidate);
      }
      current = '';
      dataUrlPayloadDelimiterSeen = false;
      continue;
    }

    current += character;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    candidates.push(tail);
  }

  return candidates;
};

export const parseSrcset = (value: string): SrcsetParseResult => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty-srcset' };
  }

  const rawCandidates = splitSrcsetCandidates(trimmed);
  if (rawCandidates.length === 0) {
    return { ok: false, reason: 'empty-candidate' };
  }

  const candidates: SrcsetCandidate[] = [];
  for (const rawCandidate of rawCandidates) {
    const parts = rawCandidate.split(/\s+/u).filter((part) => part.length > 0);
    const url = parts[0];
    if (url === undefined || url.length === 0) {
      return { ok: false, reason: 'missing-url' };
    }

    candidates.push({
      url,
      descriptors: parts.slice(1),
    });
  }

  return { ok: true, candidates };
};

export const serializeSrcset = (candidates: readonly SrcsetCandidate[]): string =>
  candidates
    .map((candidate) => [candidate.url, ...candidate.descriptors].join(' ').trim())
    .filter((candidate) => candidate.length > 0)
    .join(', ');
