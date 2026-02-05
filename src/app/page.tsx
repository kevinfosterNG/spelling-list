"use client";

import { CheckCircle2, Info, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import spellingLists from "@/data/spelling-lists.json";
import { aggregateStats } from "@/lib/stats";
import { createSeededRandom, seedFromString, shuffle } from "@/lib/shuffle";

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
const initialWordIds = firstList ? firstList.words.map((entry) => entry.word) : [];

export default function Home() {
  const seed = firstList?.id ?? "default-list";
  const initialShuffledIds = useMemo(() => {
    if (!firstList) return [];
    const seededRandom = createSeededRandom(seedFromString(seed));
    return shuffle(initialWordIds, seededRandom);
  }, [seed]);
  const [selectedListId, setSelectedListId] = useState<string>(
    firstList?.id ?? "",
  );
  const [activeList, setActiveList] = useState<SpellingList | null>(firstList);
  const [buckets, setBuckets] = useState<Buckets>(() =>
    firstList ? buildBuckets(firstList) : {},
  );
  const [remainingIds, setRemainingIds] = useState<string[]>(initialShuffledIds);
  const [currentWordId, setCurrentWordId] = useState<string | null>(
    initialShuffledIds[0] ?? null,
  );
  const [showCheck, setShowCheck] = useState(false);
  const [typedGuess, setTypedGuess] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [lastStats, setLastStats] = useState<{
    percentCorrect: number;
    correctCount: number;
    totalWords: number;
  } | null>(null);
  const autoPlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoPlayState, setAutoPlayState] = useState<"idle" | "pending">("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearAutoPlay = () => {
    if (autoPlayTimeout.current) {
      clearTimeout(autoPlayTimeout.current);
      autoPlayTimeout.current = null;
    }
    setAutoPlayState("idle");
  };

  const queueAutoPlay = (word: Word | null) => {
    clearAutoPlay();
    if (!word) return;
    setAutoPlayState("pending");
    autoPlayTimeout.current = setTimeout(() => {
      speak(word.word, word.sentence);
      autoPlayTimeout.current = null;
      setAutoPlayState("idle");
    }, 1000);
  };

  useEffect(
    () => () => {
      if (autoPlayTimeout.current) {
        clearTimeout(autoPlayTimeout.current);
        autoPlayTimeout.current = null;
      }
    },
    [],
  );

  const currentWord = useMemo(() => {
    if (!activeList || !currentWordId) return null;
    return (
      activeList.words.find((entry) => entry.word === currentWordId) ?? null
    );
  }, [activeList, currentWordId]);

  const handleListChange = (nextId: string) => {
    clearAutoPlay();
    setSelectedListId(nextId);
    const nextList = lists.find((entry) => entry.id === nextId) ?? null;
    setActiveList(nextList);
    if (nextList) {
      const nextWordIds = shuffle(nextList.words.map((entry) => entry.word));
      setRemainingIds(nextWordIds);
      setCurrentWordId(nextWordIds[0] ?? null);
      setBuckets(buildBuckets(nextList));
      setTypedGuess("");
      setShowCheck(false);
      setCheckCount(0);
      setLastStats(null);
    } else {
      setRemainingIds([]);
      setCurrentWordId(null);
      setBuckets({});
      setTypedGuess("");
      setShowCheck(false);
      setCheckCount(0);
      setLastStats(null);
    }
  };

  const allBucketKeys = activeList ? [...activeList.groups] : [];

  const handleDrop = (
    targetKey: string,
    wordKey: string,
    spelling: string | undefined,
  ) => {
    clearAutoPlay();
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
    setLastStats(null);
    inputRef.current?.focus();

    if (remainingIds.includes(word.word)) {
      const nextRemaining = remainingIds.filter((id) => id !== word.word);
      setRemainingIds(nextRemaining);
      const nextCurrent = nextRemaining[0] ?? null;
      setCurrentWordId(nextCurrent);
      setTypedGuess("");
      const nextWord =
        activeList?.words.find((entry) => entry.word === nextCurrent) ?? null;
      queueAutoPlay(nextWord);
    }
  };

  const nextPracticeWord = () => {
    clearAutoPlay();
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
    clearAutoPlay();
    setBuckets((prev) => {
      const next: Buckets = {};
      Object.entries(prev).forEach(([key, values]) => {
        next[key] = values.filter((entry) => entry.word.word !== card.word.word);
      });
      return next;
    });
    setShowCheck(false);
    setLastStats(null);
    inputRef.current?.focus();

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

  const totalWords = activeList?.words.length ?? 0;
  const wordsLeft = remainingIds.length;
  const readyWord = currentWord;
  const autoPlayPending = autoPlayState === "pending";
  const showAPlus = Boolean(
    lastStats &&
      lastStats.percentCorrect === 100 &&
      wordsLeft === 0 &&
      totalWords > 0 &&
      showCheck,
  );

  const handleCheckGroups = () => {
    const stats = aggregateStats(buckets, totalWords);
    setLastStats({ ...stats, totalWords });
    setCheckCount((prev) => prev + 1);
    setShowCheck(true);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fff8fb] via-[#f3e2e8] to-[#e6f2ec] text-[#0d0d0d]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-3 rounded-2xl bg-white/85 p-6 shadow-sm ring-1 ring-[#f2cfd7]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-3xl sm:text-4xl">
                Hear it, spell it, then sort it
              </h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="inline-flex items-center justify-center rounded-full border border-[#f2cfd7] bg-white p-2 text-[#1c4c72] shadow-sm transition hover:border-[#e7b9c3] hover:bg-[#fff6f8] hover:text-[#173d5c] active:translate-y-[1px]"
              >
                <Info className="h-4 w-4 text-[#1c4c72]" aria-hidden />
                <span className="sr-only">How to add a new week</span>
              </button>
            </div>
          </div>
          {showAPlus && (
            <div className="rainbow-border rounded-2xl p-[2px] shadow-lg transition">
              <div className="rainbow-panel relative flex items-center gap-4 rounded-[14px] px-5 py-4 text-white shadow-[0_12px_38px_rgba(0,0,0,0.25)]">
                <span className="relative text-5xl font-black leading-none rainbow-text drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]">
                  A+
                </span>
                <div className="relative leading-tight">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffdde9]">
                    Perfect!
                  </p>
                  <p className="text-base font-semibold text-white">
                    Every word spelled and sorted correctly.
                  </p>
                </div>
              </div>
            </div>
          )}
          {wordsLeft === 0 && lastStats && showCheck ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e9d6dc] bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a6192e]">
                  Attempts
                </p>
                <p className="mt-1 text-3xl font-black text-[#0d0d0d]">
                  {checkCount}
                </p>
                <p className="text-xs text-slate-600">
                  Times you&apos;ve checked the groups
                </p>
              </div>
              <div className="rounded-xl border border-[#e9d6dc] bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1c4c72]">
                  Percent correct
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-[#0d0d0d]">
                    {lastStats.percentCorrect}%
                  </p>
                  <span className="text-xs font-semibold text-slate-600">
                    {lastStats.correctCount} of {lastStats.totalWords || 0} words
                    right
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Snapshot from your last check
                </p>
              </div>
            </div>
          ) : null}
        </header>

        {(wordsLeft > 0 || readyWord) && (
          <section className="rounded-2xl border border-[#e9d6dc] bg-white p-6 shadow-sm">
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    currentWord &&
                    speak(currentWord.word, currentWord.sentence)
                  }
                  disabled={!currentWord}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#a6192e] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8f1529] active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-[#e7b9c3]"
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={nextPracticeWord}
                  disabled={!remainingIds.length}
                  className="rounded-lg border border-[#a6192e] bg-white px-3 py-2 text-sm font-semibold text-[#a6192e] transition hover:border-[#8f1529] hover:bg-[#fff6f8] hover:text-[#8f1529] active:translate-y-[1px] disabled:cursor-not-allowed disabled:border-[#e7b9c3] disabled:text-[#e7b9c3]"
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
                className="mt-4 cursor-grab rounded-lg border border-[#e5e7eb] bg-[#f7f7f8] p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d0d0d]">
                      Spell it, then drag this card
                    </p>
                  </div>
                  <button
                    type="button"
                    className="relative inline-flex items-center gap-1 rounded-full bg-[#0a0a0a] px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a1a1a] active:translate-y-[1px]"
                    onClick={() => speak(readyWord.word, readyWord.sentence)}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                    {autoPlayPending && (
                      <span
                        className="absolute -right-2 -top-2 inline-flex h-3 w-3 items-center justify-center"
                        aria-hidden
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f2cfd7] opacity-80" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a6192e]" />
                      </span>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={typedGuess}
                  spellCheck={false}
                  autoComplete="off"
                  ref={inputRef}
                  onChange={(event) => handleType(event.target.value)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => event.preventDefault()}
                  className="mt-2 w-full rounded-lg border border-[#e4ced5] bg-white px-3 py-2 text-base font-semibold text-[#0d0d0d] shadow-sm focus:border-[#a6192e] focus:outline-none focus:ring-2 focus:ring-[#f2cfd7]"
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

        <section className="rounded-2xl border border-[#e9d6dc] bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                Words left to place:{" "}
                <span className="font-semibold text-slate-900">{wordsLeft}</span>
              </span>
              {wordsLeft === 0 && (
                <button
                  type="button"
                  onClick={handleCheckGroups}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a1a1a] active:translate-y-[1px]"
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
                className={`rounded-xl border border-[#e7d3da] bg-white p-3 shadow-sm transition hover:shadow-lg ${
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
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f1529]">
                      {bucketKey}
                    </span>
                    <span className="rounded-full bg-[#f7eef2] px-2 py-1 text-[11px] font-semibold text-[#8f1529]">
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
                            className="inline-flex items-center gap-1 rounded-full bg-[#f2cfd7] px-2.5 py-1 text-xs font-semibold text-[#8f1529] shadow-sm transition hover:bg-[#e7b9c3] active:translate-y-[1px]"
                            onClick={() => speak(entry.word.word, entry.word.sentence)}
                          >
                            <Volume2 className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-[#f7eef2] px-2.5 py-1 text-xs font-semibold text-[#0d0d0d] shadow-sm ring-1 ring-[#f2cfd7] transition hover:bg-[#f2cfd7] active:translate-y-[1px]"
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
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e5e7eb] bg-[#f7f7f8] p-4 text-sm text-[#4b5563]">
                      Drag a spelled card here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {showInfoModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setShowInfoModal(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-[#c7d9e8]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#1c4c72]">
                    Add a new week
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Update <code>src/data/spelling-lists.json</code> with your
                    new list, then restart or rebuild to see it in the dropdown.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="inline-flex items-center justify-center rounded-full border border-[#c7d9e8] bg-[#f5f9fd] px-2 py-1 text-sm font-semibold text-[#1c4c72] shadow-sm transition hover:border-[#b1c9de] hover:bg-[#e8f1f8] hover:text-[#173d5c] active:translate-y-[1px]"
                >
                  <span aria-hidden>X</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>
                  Each entry needs an <code>id</code>, <code>label</code>,{" "}
                  <code>groups</code>, and <code>words</code> array. Words should
                  include a <code>word</code>, <code>sentence</code>, and{" "}
                  <code>group</code> that matches one of the bucket names.
                </li>
                <li>
                  Contributing it back? Open a branch and Pull Request on
                  GitHub. Full steps live in the{" "}
                  <a
                    href="https://github.com/kevinfosterNG/spelling-list#add-a-new-week"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#1c4c72] hover:text-[#173d5c]"
                  >
                    README
                  </a>
                  .
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://github.com/kevinfosterNG/spelling-list"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-[#c7d9e8] bg-[#f5f9fd] px-3 py-2 text-sm font-semibold text-[#1c4c72] shadow-sm transition hover:border-[#b1c9de] hover:bg-[#e8f1f8] active:translate-y-[1px]"
                >
                  View on GitHub
                </a>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-[#1c4c72] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173d5c] active:translate-y-[1px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </main>
  );
}
