export type StatWord = {
  word: string;
  group: string;
};

export type StatCard = {
  word: StatWord;
  spelling: string;
};

export type StatBuckets = Record<string, StatCard[]>;

export const isCardCorrect = (card: StatCard, bucketKey: string): boolean => {
  const spelled = (card.spelling ?? "").trim().toLowerCase();
  return bucketKey === card.word.group && spelled === card.word.word.toLowerCase();
};

export const aggregateStats = (
  buckets: StatBuckets,
  totalWords: number,
): { placedCount: number; correctCount: number; percentCorrect: number } => {
  const bucketEntries = Object.entries(buckets ?? {});
  const placedCount = bucketEntries.reduce(
    (acc, [, cards]) => acc + (cards?.length ?? 0),
    0,
  );

  const correctCount = bucketEntries.reduce((acc, [bucketKey, cards]) => {
    if (!cards?.length) return acc;
    const correctCards = cards.filter((card) => isCardCorrect(card, bucketKey));
    return acc + correctCards.length;
  }, 0);

  const percentCorrect = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;

  return { placedCount, correctCount, percentCorrect };
};
