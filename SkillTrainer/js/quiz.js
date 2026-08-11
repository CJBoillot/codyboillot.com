/*
 * quiz.js - the quiz runtime.
 *
 * Four question types, each with a grader in one registry, so adding a fifth is
 * an addition rather than a refactor. Passing a quiz is what marks its module
 * complete, which is what unlocks the tier above it.
 *
 * Attempt state lives in this module rather than the store: it is throwaway,
 * and only the outcome is worth persisting.
 */

import { html, icon, on, safeUrl } from "./dom.js";
import { renderMarkdown } from "./markdown.js";
import { moduleDisplayName, moduleTierLabel } from "./schema.js";
import { blockingModule, canComplete, recordAttempt } from "./store.js";
import { requestRender, routes } from "./main.js";
import { toast } from "./ui.js";

/* ---------------------------------------------------------------- state */

let attempt = null;
let onScreen = null; // { quiz, moduleId, treeId } for the quiz currently rendered

function startAttempt(quiz) {
  const order = quiz.questions.map((q) => q.id);
  if (quiz.shuffleQuestions) shuffle(order);

  const choiceOrder = {};
  quiz.questions.forEach((q) => {
    if (!q.choices) return;
    const ids = q.choices.map((c) => c.id);
    if (quiz.shuffleChoices) shuffle(ids);
    choiceOrder[q.id] = ids;
  });

  attempt = { quizId: quiz.id, order, choiceOrder, answers: {}, submitted: false, result: null };
  return attempt;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/* -------------------------------------------------------------- graders */

const GRADERS = {
  mc: (q, answer) => {
    const correct = q.choices.find((c) => c.correct);
    return { right: !!correct && answer === correct.id, answered: answer != null };
  },

  multi: (q, answer) => {
    const picked = new Set(Array.isArray(answer) ? answer : []);
    const correct = new Set(q.choices.filter((c) => c.correct).map((c) => c.id));
    const same = picked.size === correct.size && [...picked].every((id) => correct.has(id));
    return { right: same, answered: picked.size > 0 };
  },

  tf: (q, answer) => ({ right: answer === q.answer, answered: answer != null }),

  exact: (q, answer) => {
    const given = String(answer ?? "").trim();
    const norm = (s) => (q.caseSensitive ? s.trim() : s.trim().toLowerCase());
    const right = q.answers.some((a) => String(a).trim() && norm(String(a)) === norm(given));
    return { right, answered: given.length > 0 };
  },
};

function grade(quiz) {
  let earned = 0;
  let possible = 0;
  const perQuestion = {};

  quiz.questions.forEach((q) => {
    const points = Number(q.points) || 1;
    possible += points;
    const verdict = (GRADERS[q.type] || GRADERS.mc)(q, attempt.answers[q.id]);
    perQuestion[q.id] = verdict;
    if (verdict.right) earned += points;
  });

  const pct = possible ? (earned / possible) * 100 : 0;
  return { earned, possible, pct, perQuestion, passed: pct >= quiz.passPct };
}

/* --------------------------------------------------------------- render */

export function renderQuiz(tree, entry) {
  const { module } = entry;
  const quiz = module.quiz;
  onScreen = quiz ? { quiz, moduleId: module.id, treeId: tree.id } : null;

  if (!quiz?.questions?.length) {
    return html`
      <div class="wrap view">
        <div class="empty">
          <h3>No quiz on this module</h3>
          <p>Add questions to it in the editor, or mark the module complete from the reader.</p>
          <a class="btn btn-primary" href="${routes.module(tree.id, module.id, entry.column?.id)}">Back to the module</a>
        </div>
      </div>
    `;
  }

  /*
   * The reading is open to everyone; only the quiz is ordered, because passing
   * it is what turns the box green and a level should mean the levels below it
   * were earned first.
   */
  if (!canComplete(tree, entry)) {
    const blocker = blockingModule(tree, entry);
    return html`
      <div class="wrap view">
        <div class="empty">
          <h3>Not yet</h3>
          <p>
            ${blocker
              ? html`Pass <b>${moduleDisplayName(blocker)}</b> first. Its quiz is what unlocks this one.`
              : "Complete the tier below this one first."}
          </p>
          <div class="row" style="justify-content:center;margin-top:1.2rem">
            ${blocker
              ? html`<a class="btn btn-primary" href="${routes.quiz(tree.id, blocker.module.id)}">
                  ${icon("play")} Go to ${moduleDisplayName(blocker)}
                </a>`
              : ""}
            <a class="btn btn-ghost" href="${routes.module(tree.id, module.id, entry.column?.id)}">
              ${icon("book")} Read this module anyway
            </a>
          </div>
        </div>
      </div>
    `;
  }

  if (!attempt || attempt.quizId !== quiz.id) startAttempt(quiz);

  const byId = new Map(quiz.questions.map((q) => [q.id, q]));
  const questions = attempt.order.map((id) => byId.get(id)).filter(Boolean);
  const answered = questions.filter((q) => attempt.answers[q.id] != null && attempt.answers[q.id] !== "").length;

  return html`
    <div class="wrap view">
      <div class="quiz">
        <div class="quiz-head">
          <div class="mod-kicker">
            <span class="pill ghost">${moduleTierLabel(entry)}</span>
            <span class="chip">${moduleDisplayName(entry)}</span>
            ${entry.role === "tier" && module.title ? html`<span class="chip">${module.title}</span>` : ""}
          </div>
          <h1>${quiz.title || "Module check"}</h1>
          ${quiz.intro ? html`<div class="prose">${renderMarkdown(quiz.intro)}</div>` : ""}
          <div class="quiz-meta">
            <span class="chip">${questions.length} questions</span>
            <span class="chip">${quiz.passPct}% to pass</span>
            ${quiz.allowRetry ? html`<span class="chip">Retries allowed</span>` : ""}
          </div>
        </div>

        ${attempt.submitted ? resultCard(quiz) : ""}

        ${questions.map((q, i) => questionCard(q, i))}

        ${attempt.submitted
          ? html`<div class="quiz-actions">
              ${quiz.allowRetry
                ? html`<button class="btn btn-ghost" data-act="quiz-retry">${icon("reset")} Try again</button>`
                : ""}
              <a class="btn btn-primary" href="${routes.tree(tree.id)}">${icon("grid")} Back to the tree</a>
            </div>`
          : html`<div class="quiz-bar">
              <span style="font-size:.85rem;color:var(--muted)">${answered} of ${questions.length} answered</span>
              <div class="row">
                <a class="btn btn-quiet" href="${routes.module(tree.id, module.id, entry.column?.id)}">Back</a>
                <button class="btn btn-primary" data-act="quiz-submit"
                        ${answered === 0 ? "disabled" : ""}>Submit answers</button>
              </div>
            </div>`}
      </div>
    </div>
  `;
}

function resultCard(quiz) {
  const r = attempt.result;
  return html`
    <div class="quiz-result ${r.passed ? "pass" : "fail"}">
      <div class="score">${Math.round(r.pct)}%</div>
      <p>
        ${r.earned} of ${r.possible} points.
        ${r.passed
          ? "Passed. This module is complete and the next tier is open."
          : `You need ${quiz.passPct}% to pass. Review the answers below and try again.`}
      </p>
    </div>
  `;
}

function questionCard(q, index) {
  const answer = attempt.answers[q.id];
  const verdict = attempt.submitted ? attempt.result.perQuestion[q.id] : null;
  const img = safeUrl(q.image);

  return html`
    <div class="q-card" data-q="${q.id}">
      <div class="q-num">
        <span>Question ${index + 1}</span>
        ${(Number(q.points) || 1) > 1 ? html`<span class="chip">${q.points} pts</span>` : ""}
        ${verdict
          ? html`<span class="pill ${verdict.right ? "ok" : "ghost"}"
                       style="${verdict.right ? "" : "color:var(--danger)"}">
              ${verdict.right ? "Correct" : "Incorrect"}
            </span>`
          : ""}
      </div>

      <div class="q-prompt">${q.prompt}</div>
      ${img ? html`<img class="q-image" src="${img}" alt="${q.imageAlt || ""}" loading="lazy">` : ""}

      ${renderInput(q, answer, verdict)}

      ${verdict && !verdict.right
        ? html`<div class="q-verdict wrong">
            <b>${verdict.answered ? "Not quite" : "You skipped this one"}</b>
            ${expected(q)}
            ${q.explanation ? html`<div style="margin-top:.4rem">${q.explanation}</div>` : ""}
          </div>`
        : verdict && q.explanation
          ? html`<div class="q-verdict right"><b>Correct</b>${q.explanation}</div>`
          : ""}
    </div>
  `;
}

function expected(q) {
  if (q.type === "tf") return html`<div>The answer is ${q.answer ? "True" : "False"}.</div>`;
  if (q.type === "exact") {
    return html`<div>Accepted: ${q.answers.filter((a) => String(a).trim()).join(", ")}</div>`;
  }
  const right = q.choices.filter((c) => c.correct).map((c) => c.text);
  return html`<div>${right.length > 1 ? "Correct answers" : "Correct answer"}: ${right.join(", ")}</div>`;
}

function renderInput(q, answer, verdict) {
  const locked = attempt.submitted;

  if (q.type === "tf") {
    return html`
      <div class="choices">
        ${[true, false].map((value) => {
          const picked = answer === value;
          const cls = [
            "choice",
            picked && !locked ? "is-picked" : "",
            locked && value === q.answer ? "is-right" : "",
            locked && picked && value !== q.answer ? "is-wrong" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return html`
            <label class="${cls}">
              <input type="radio" name="q-${q.id}" value="${String(value)}" ${picked ? "checked" : ""}
                     ${locked ? "disabled" : ""} data-act="answer" data-q="${q.id}" data-kind="tf">
              <span>${value ? "True" : "False"}</span>
            </label>
          `;
        })}
      </div>
    `;
  }

  if (q.type === "exact") {
    const right = verdict?.right;
    return html`
      <input type="text" value="${answer ?? ""}" placeholder="Type your answer"
             ${locked ? "disabled" : ""} data-act="answer" data-q="${q.id}" data-kind="exact"
             style="${locked ? `border-color:var(--${right ? "ok" : "danger"})` : ""}">
      ${!q.caseSensitive && !locked
        ? html`<div class="hint" style="margin-top:.35rem">Capitalisation does not matter.</div>`
        : ""}
    `;
  }

  const multi = q.type === "multi";
  const picked = multi ? new Set(Array.isArray(answer) ? answer : []) : null;
  const order = attempt.choiceOrder[q.id] || q.choices.map((c) => c.id);
  const byId = new Map(q.choices.map((c) => [c.id, c]));

  return html`
    ${multi && !locked
      ? html`<div class="hint" style="margin-bottom:.5rem">Select every correct answer.</div>`
      : ""}
    <div class="choices">
      ${order.map((id) => {
        const choice = byId.get(id);
        if (!choice) return "";
        const isPicked = multi ? picked.has(id) : answer === id;
        const cls = [
          "choice",
          isPicked && !locked ? "is-picked" : "",
          locked && choice.correct ? "is-right" : "",
          locked && isPicked && !choice.correct ? "is-wrong" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return html`
          <label class="${cls}">
            <input type="${multi ? "checkbox" : "radio"}" name="q-${q.id}" value="${id}"
                   ${isPicked ? "checked" : ""} ${locked ? "disabled" : ""}
                   data-act="answer" data-q="${q.id}" data-kind="${multi ? "multi" : "mc"}">
            <span>${choice.text}</span>
            ${locked && choice.correct ? html`<span class="mark">correct</span>` : ""}
          </label>
        `;
      })}
    </div>
  `;
}

/* -------------------------------------------------------------- handlers */

on(document, "change", '[data-act="answer"]', (_, input) => {
  if (!attempt || attempt.submitted) return;
  const qid = input.dataset.q;

  switch (input.dataset.kind) {
    case "tf":
      attempt.answers[qid] = input.value === "true";
      break;
    case "multi": {
      const set = new Set(Array.isArray(attempt.answers[qid]) ? attempt.answers[qid] : []);
      if (input.checked) set.add(input.value);
      else set.delete(input.value);
      attempt.answers[qid] = [...set];
      break;
    }
    default:
      attempt.answers[qid] = input.value;
  }
  // Only the counter changes; leaving the DOM alone keeps focus and scroll put.
  updateAnsweredCount();
});

on(document, "input", '[data-act="answer"][data-kind="exact"]', (_, input) => {
  if (!attempt || attempt.submitted) return;
  attempt.answers[input.dataset.q] = input.value;
  updateAnsweredCount();
});

function updateAnsweredCount() {
  const label = document.querySelector(".quiz-bar span");
  const submit = document.querySelector('[data-act="quiz-submit"]');
  if (!label || !attempt) return;
  const total = attempt.order.length;
  const done = attempt.order.filter((id) => {
    const v = attempt.answers[id];
    return Array.isArray(v) ? v.length > 0 : v != null && v !== "";
  }).length;
  label.textContent = `${done} of ${total} answered`;
  if (submit) submit.disabled = done === 0;
}

on(document, "click", '[data-act="quiz-submit"]', () => {
  const quiz = currentQuiz();
  if (!quiz || !attempt) return;

  attempt.result = grade(quiz);
  attempt.submitted = true;

  recordAttempt(currentModuleId(), attempt.result.pct, attempt.result.passed);
  toast(
    attempt.result.passed
      ? `Passed with ${Math.round(attempt.result.pct)}%.`
      : `${Math.round(attempt.result.pct)}%. ${quiz.passPct}% needed.`,
    attempt.result.passed ? "ok" : "err"
  );
  requestRender();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

on(document, "click", '[data-act="quiz-retry"]', () => {
  const quiz = currentQuiz();
  if (quiz) startAttempt(quiz);
  requestRender();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* The handlers are global. renderQuiz records what is currently on screen so
   they do not have to re-derive it from the route. */
function currentQuiz() {
  return onScreen?.quiz || null;
}
function currentModuleId() {
  return onScreen?.moduleId || null;
}
