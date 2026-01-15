"use client";

import { CheckCircle2, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import spellingLists from "@/data/spelling-lists.json";

type Word = {
  word: string;
  sentence: string;
  group: string;
};

type SpellingList = {
  id: string;
  label: string;
  groups: string[];
  words: Word[];
};

type Card = {
  word: Word;
  spelling: string;
};

type Buckets = Record<string, Card[]>;

const buildBuckets = (list: SpellingList): Buckets => {
  const next: Buckets = {};
  list.groups.forEach((group) => {
    next[group] = [];
  });
  return next;
};

const speak = (word: string, sentence: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(`${word}. ${sentence}`);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const bucketOrderClasses: Record<string, string> = {};

const lists: SpellingList[] = spellingLists;
const firstList = lists[0] ?? null;
const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const initialWordIds = firstList ? firstList.words.map((entry) => entry.word) : [];

export default function Home() {
  const [selectedListId, setSelectedListId] = useState<string>(
    firstList?.id ?? "",
  );
  const [activeList, setActiveList] = useState<SpellingList | null>(firstList);
  const [buckets, setBuckets] = useState<Buckets>(() =>
    firstList ? buildBuckets(firstList) : {},
  );
  const [remainingIds, setRemainingIds] = useState<string[]>(initialWordIds);
  const [currentWordId, setCurrentWordId] = useState<string | null>(
    initialWordIds[0] ?? null,
  );
  const [showCheck, setShowCheck] = useState(false);
  const [typedGuess, setTypedGuess] = useState("");

  const currentWord = useMemo(() => {
    if (!activeList || !currentWordId) return null;
    return (
      activeList.words.find((entry) => entry.word === currentWordId) ?? null
    );
  }, [activeList, currentWordId]);

  const handleListChange = (nextId: string) => {
    setSelectedListId(nextId);
    const nextList = lists.find((entry) => entry.id === nextId) ?? null;
    setActiveList(nextList);
  };

  useEffect(() => {
    if (!activeList) return;
    const nextWordIds = shuffle(activeList.words.map((entry) => entry.word));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemainingIds(nextWordIds);
    setCurrentWordId(nextWordIds[0] ?? null);
    setBuckets(buildBuckets(activeList));
    setTypedGuess("");
    setShowCheck(false);
  }, [activeList]);

  const allBucketKeys = activeList ? [...activeList.groups] : [];

  const handleDrop = (
    targetKey: string,
    wordKey: string,
    spelling: string | undefined,
  ) => {
    const word = activeList?.words.find((entry) => entry.word === wordKey);
    if (!word) return;

    const spelled = (spelling ?? typedGuess).trim();

    setBuckets((prev) => {
      const next: Buckets = {};
      Object.entries(prev).forEach(([key, values]) => {
        next[key] = values.filter((entry) => entry.word.word !== word.word);
      });
      next[targetKey] = [
        ...(next[targetKey] ?? []),
        { word, spelling: spelled },
      ];
      return next;
    });
    setShowCheck(false);

    if (remainingIds.includes(word.word)) {
      const nextRemaining = remainingIds.filter((id) => id !== word.word);
      setRemainingIds(nextRemaining);
      const nextCurrent = nextRemaining[0] ?? null;
      setCurrentWordId(nextCurrent);
      setTypedGuess("");
    }
  };

  const nextPracticeWord = () => {
    if (!remainingIds.length) return;
    const shuffled = shuffle(remainingIds);
    const nextId = shuffled[0] ?? null;
    setRemainingIds(shuffled);
    setCurrentWordId(nextId);
    setTypedGuess("");
  };

  const handleType = (value: string) => {
    setTypedGuess(value);
  };

  const handleDeleteCard = (bucketKey: string, card: Card) => {
    setBuckets((prev) => {
      const next: Buckets = {};
      Object.entries(prev).forEach(([key, values]) => {
        next[key] = values.filter((entry) => entry.word.word !== card.word.word);
      });
      return next;
    });
    setShowCheck(false);

    setTypedGuess(card.spelling);
    setCurrentWordId(card.word.word);
    setRemainingIds((prev) => {
      if (prev.includes(card.word.word)) return prev;
      return [card.word.word, ...prev];
    });
  };

  const cardFeedbackStyles = (
    card: Card,
    bucketKey: string,
    showStatus: boolean,
  ) => {
    if (!showStatus) return "border-slate-200 bg-white";
    const isGroupCorrect = bucketKey === card.word.group;
    const isSpellingCorrect =
      (card.spelling ?? "").trim().toLowerCase() ===
      card.word.word.toLowerCase();
    if (isGroupCorrect && isSpellingCorrect) {
      return "border-emerald-500 bg-emerald-100 text-emerald-900";
    }
    return "border-rose-400 bg-rose-100 text-rose-900";
  };

  if (!activeList) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-lg font-semibold text-slate-700">
          Add a list to src/data/spelling-lists.json to get started.
        </p>
      </main>
    );
  }

  const wordsLeft = remainingIds.length;
  const readyWord = currentWord;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-3 rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Hear it, spell it, then sort it
            </h1>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex w-full max-w-xs items-center gap-3 text-sm font-medium text-slate-700">
                <select
                  value={selectedListId}
                  onChange={(event) => handleListChange(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        {(wordsLeft > 0 || readyWord) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    currentWord &&
                    speak(currentWord.word, currentWord.sentence)
                  }
                  disabled={!currentWord}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={nextPracticeWord}
                  disabled={!remainingIds.length}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100 active:translate-y-[1px] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Next word
                </button>
              </div>
            </div>

            {readyWord ? (
              <article
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", readyWord.word);
                  event.dataTransfer.setData(
                    "application/spelling-display",
                    typedGuess,
                  );
                  event.dataTransfer.effectAllowed = "move";
                }}
                className="mt-4 cursor-grab rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      Spell it, then drag this card
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:translate-y-[1px]"
                    onClick={() => speak(readyWord.word, readyWord.sentence)}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <input
                  type="text"
                  value={typedGuess}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => handleType(event.target.value)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => event.preventDefault()}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Type what you hear"
                />
                <div className="mt-2 text-sm font-semibold">
                  {typedGuess ? (
                    <span className="text-slate-800">{typedGuess}</span>
                  ) : (
                    <></>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Sentence:{" "}
                  {readyWord.sentence.replace(
                    new RegExp(readyWord.word, "gi"),
                    "_____",
                  )}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Drag this card into ar / air / are / oddball.
                </p>
              </article>
            ) : null}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                Words left to place:{" "}
                <span className="font-semibold text-slate-900">{wordsLeft}</span>
              </span>
              {wordsLeft === 0 && (
                <button
                  type="button"
                  onClick={() => setShowCheck(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:translate-y-[1px]"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Check groups
                </button>
              )}
              {showCheck && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Correct! 🙂
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">
                    Incorrect 🙁
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBucketKeys.map((bucketKey) => (
              <div
                key={bucketKey}
                className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
                  bucketOrderClasses[bucketKey] ?? ""
                }`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const wordKey = event.dataTransfer.getData("text/plain");
                  const spelling =
                    event.dataTransfer.getData("application/spelling-display") ||
                    "";
                  if (wordKey) handleDrop(bucketKey, wordKey, spelling);
                }}
              >
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {bucketKey}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      {buckets[bucketKey]?.length ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex min-h-[160px] flex-col gap-3">
                  {(buckets[bucketKey] ?? []).map((entry) => (
                    <article
                      key={entry.word.word}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", entry.word.word);
                        event.dataTransfer.setData(
                          "application/spelling-display",
                          entry.spelling,
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className={`group cursor-grab rounded-lg border p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${cardFeedbackStyles(entry, bucketKey, showCheck)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold">
                            {entry.spelling ? (
                              <span className="text-slate-900">
                                {entry.spelling}
                              </span>
                            ) : (
                              <span className="text-rose-600">
                                Nothing entered
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-800 active:translate-y-[1px]"
                            onClick={() => speak(entry.word.word, entry.word.sentence)}
                          >
                            <Volume2 className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-200 active:translate-y-[1px]"
                            onClick={() => handleDeleteCard(bucketKey, entry)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {entry.word.sentence.replace(
                          new RegExp(entry.word.word, "gi"),
                          "_____",
                        )}
                      </p>
                    </article>
                  ))}
                  {!buckets[bucketKey]?.length && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                      Drag a spelled card here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold">Add a new week</h4>
          <p className="mt-1 text-sm text-slate-600">
            Open <code>src/data/spelling-lists.json</code> and add a new entry
            with an <code>id</code>, <code>label</code>, <code>groups</code>,
            and <code>words</code> array. Reload to pick it in the dropdown.
          </p>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-mono text-slate-700">
            {`{
  "id": "sort-28",
  "label": "Sort #28",
  "groups": ["group-a", "group-b", "oddball"],
  "words": [
    { "word": "example", "sentence": "Use me in a sentence.", "group": "group-a" }
  ]
}`}
          </div>
        </section>
      </div>
    </main>
  );
}
