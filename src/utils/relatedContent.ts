import { CatalogItem } from "../domain/content";

interface RankedContent {
  item: CatalogItem;
  score: number;
  similarityScore: number;
}

interface IndexedContent {
  key: string;
  item: CatalogItem;
  title: string;
  keywords: Set<string>;
  genres: string[];
  popularity: number;
}

export interface RelatedContentIndex {
  all: IndexedContent[];
  byKey: Map<string, IndexedContent>;
  byGenre: Map<string, IndexedContent[]>;
  byKeyword: Map<string, IndexedContent[]>;
}

const LIMIT = 20;
const HERO_GENRES = new Set(["dc", "marvel", "super heroi"]);
const TITLE_STOP_WORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "um",
  "uma",
  "the",
  "of",
  "and",
]);

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const titleKeywords = (title: string) =>
  new Set(
    normalizeText(title)
      .split(" ")
      .filter((word) => word.length >= 3 && !TITLE_STOP_WORDS.has(word)),
  );

const popularityWeight = (popularity: number) =>
  popularity > 0 ? Math.min(Math.log10(popularity + 1), 2) : 0;

const internalGenres = (item: CatalogItem) => item.mongo.genero ?? [];

const indexItem = (item: CatalogItem): IndexedContent => {
  const title = normalizeText(item.mongo.title);
  return {
    key: `${item.kind}:${item.id}`,
    item,
    title,
    keywords: titleKeywords(title),
    genres: internalGenres(item).map(normalizeText),
    popularity: popularityWeight(item.tmdb?.popularity ?? 0),
  };
};

export const createRelatedContentIndex = (
  items: CatalogItem[],
): RelatedContentIndex => {
  const all = items.map(indexItem);
  const byKey = new Map(all.map((entry) => [entry.key, entry]));
  const byGenre = new Map<string, IndexedContent[]>();
  const byKeyword = new Map<string, IndexedContent[]>();

  all.forEach((entry) => {
    entry.genres.forEach((genre) => {
      const entries = byGenre.get(genre) ?? [];
      entries.push(entry);
      byGenre.set(genre, entries);
    });
    entry.keywords.forEach((keyword) => {
      const entries = byKeyword.get(keyword) ?? [];
      entries.push(entry);
      byKeyword.set(keyword, entries);
    });
  });

  return { all, byKey, byGenre, byKeyword };
};

const relatedCandidates = (
  reference: IndexedContent,
  index: RelatedContentIndex,
) => {
  const candidates = new Map<string, IndexedContent>();
  reference.genres.forEach((genre) => {
    index.byGenre.get(genre)?.forEach((entry) => candidates.set(entry.key, entry));
  });
  reference.keywords.forEach((keyword) => {
    index.byKeyword
      .get(keyword)
      ?.forEach((entry) => candidates.set(entry.key, entry));
  });
  index.all.forEach((entry) => {
    if (
      entry.title.includes(reference.title) ||
      reference.title.includes(entry.title)
    ) {
      candidates.set(entry.key, entry);
    }
  });
  return candidates.size ? [...candidates.values()] : index.all;
};

const rankRelatedContent = (
  reference: CatalogItem,
  index: RelatedContentIndex,
): RankedContent[] => {
  const referenceKey = `${reference.kind}:${reference.id}`;
  const indexedReference = index.byKey.get(referenceKey) ?? indexItem(reference);
  const referenceTitle = indexedReference.title;
  const referenceKeywords = indexedReference.keywords;
  const referenceGenres = indexedReference.genres;
  const referenceGenreSet = new Set(referenceGenres);
  const referenceFirstGenre = referenceGenres[0];

  return relatedCandidates(indexedReference, index)
    .filter((candidate) => candidate.key !== referenceKey)
    .map((candidate): RankedContent => {
      const candidateTitle = candidate.title;
      const candidateKeywords = candidate.keywords;
      const candidateGenres = candidate.genres;
      const matchingKeywords = [...referenceKeywords].filter((keyword) =>
        candidateKeywords.has(keyword),
      ).length;
      const sharedGenres = candidateGenres.filter((genre) =>
        referenceGenreSet.has(genre),
      );
      const allReferenceGenresMatch =
        referenceGenres.length > 0 &&
        sharedGenres.length === referenceGenres.length;
      const firstGenreMatches =
        referenceFirstGenre !== undefined &&
        candidateGenres[0] === referenceFirstGenre;
      const heroGenreMatches = sharedGenres.filter((genre) =>
        HERO_GENRES.has(genre),
      ).length;
      const keywordCoverage = referenceKeywords.size
        ? matchingKeywords / referenceKeywords.size
        : 0;
      const isSameTitle = candidateTitle === referenceTitle;
      const isRelatedTitle =
        candidateTitle.includes(referenceTitle) ||
        referenceTitle.includes(candidateTitle);
      const titleScore = isSameTitle
        ? 20
        : isRelatedTitle
          ? 15
          : keywordCoverage === 1
            ? 12
            : keywordCoverage >= 0.75
              ? 9
              : keywordCoverage >= 0.5
                ? 6
                : matchingKeywords > 0
                  ? 3
                  : 0;
      const genreScore =
        sharedGenres.length * 2 +
        (allReferenceGenresMatch ? 2 : 0) +
        (firstGenreMatches ? 1 : 0) +
        heroGenreMatches * 2;
      const similarityScore = titleScore + genreScore;

      return {
        item: candidate.item,
        similarityScore,
        score: similarityScore + candidate.popularity,
      };
    })
    .filter((candidate) => candidate.similarityScore > 0)
    .sort((first, second) => second.score - first.score);
};

export const getRelatedContent = (
  reference: CatalogItem,
  index: RelatedContentIndex,
) => {
  const rankedItems = rankRelatedContent(reference, index);
  const selectedItems = [
    ...rankedItems.filter(({ item }) => item.kind === "movie").slice(0, LIMIT / 2),
    ...rankedItems.filter(({ item }) => item.kind === "series").slice(0, LIMIT / 2),
  ];
  const selectedKeys = new Set(
    selectedItems.map(({ item }) => `${item.kind}:${item.id}`),
  );

  for (const candidate of rankedItems) {
    if (selectedItems.length >= LIMIT) break;
    const key = `${candidate.item.kind}:${candidate.item.id}`;
    if (!selectedKeys.has(key)) {
      selectedItems.push(candidate);
      selectedKeys.add(key);
    }
  }

  return selectedItems
    .sort((first, second) => second.score - first.score)
    .map(({ item }) => item);
};
