type ScoreInputs = {
  trustWeight: number;
  createdAt: string;
  expiresAt?: string | null;
  code?: string;
  consensus?: number;
  votesWorked?: number;
  votesFailed?: number;
  storePopularity?: number;
  copyCount?: number;
  saveCount?: number;
  reportedCount?: number;
  isUnknownStore?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const computeScores = (input: ScoreInputs) => {
  const now = Date.now();
  const createdAt = new Date(input.createdAt).getTime();
  const hoursOld = Math.max(0, (now - createdAt) / (1000 * 60 * 60));
  const freshness = clamp(Math.max(0, 72 - hoursOld) / 72, 0, 1);
  const codeBoost = input.code ? 0.1 : 0;
  const storeBoost = clamp((input.storePopularity ?? 0) / 150, 0, 0.25);
  const engagementBoost = clamp(((input.copyCount ?? 0) + (input.saveCount ?? 0)) / 40, 0, 0.15);
  const reportPenalty = clamp((input.reportedCount ?? 0) * 0.08, 0, 0.3);
  const unknownPenalty = input.isUnknownStore ? 0.25 : 0;
  const consensusBoost = clamp((input.consensus ?? 1) * 0.02, 0, 0.08);
  const baseConfidence = clamp(
    input.trustWeight * 0.55 +
      freshness * 0.2 +
      codeBoost +
      storeBoost +
      engagementBoost +
      consensusBoost -
      reportPenalty -
      unknownPenalty,
    0,
    1
  );

  const reasons: string[] = [];
  if (freshness > 0.6) {
    reasons.push('Fresh deal');
  }
  if (codeBoost > 0) {
    reasons.push('Code available');
  }
  if (storeBoost > 0.1) {
    reasons.push('Popular store');
  }
  if (engagementBoost > 0.05) {
    reasons.push('High engagement');
  }
  if (reportPenalty > 0.15) {
    reasons.push('Community reports');
  }
  if (unknownPenalty > 0) {
    reasons.push('Unknown store');
  }

  const confidenceScore = baseConfidence * 100;
  const hotScore = clamp(
    baseConfidence * 65 +
      freshness * 30 +
      (input.copyCount ?? 0) * 0.8 +
      (input.saveCount ?? 0) * 0.6 -
      reportPenalty * 20,
    0,
    100
  );

  const verifiedRatio =
    (input.votesWorked ?? 0) + (input.votesFailed ?? 0) > 0
      ? (input.votesWorked ?? 0) / ((input.votesWorked ?? 0) + (input.votesFailed ?? 0))
      : 0;
  const verifiedScore = clamp(verifiedRatio * 100 + consensusBoost * 50, 0, 100);

  return { confidenceScore, hotScore, verifiedScore, confidenceReasons: reasons };
};
