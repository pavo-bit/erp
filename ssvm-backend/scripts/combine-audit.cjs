#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "../..");
const auditDirectory = path.join(repositoryRoot, "docs", "AUDIT");
const evidenceDirectory = path.join(auditDirectory, "evidence");
const requirementsPath = path.join(auditDirectory, "REQUIREMENTS.json");
const markdownPath = path.join(auditDirectory, "CONSOLIDATED_AUDIT.md");
const jsonPath = path.join(auditDirectory, "CONSOLIDATED_AUDIT.json");
const lanes = ["A", "B", "C", "D", "E", "F", "G"];
const jobStatuses = new Set(["PASS", "FAIL", "SKIPPED", "PENDING", "UNVERIFIED"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function validUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function shortScore(value) {
  // Always floor, never round a score up.
  return Math.floor(value * 100) / 100;
}

function validateLaneEvidence(evidence, expectedLane, filePath) {
  assert(evidence && typeof evidence === "object", `${filePath}: expected an object.`);
  assert(evidence.schemaVersion === 1, `${filePath}: schemaVersion must be 1.`);
  assert(evidence.lane === expectedLane, `${filePath}: lane must be ${expectedLane}.`);
  assert(/^[0-9a-f]{40}$/.test(evidence.commit ?? ""), `${filePath}: commit must be a full 40-character SHA.`);
  assert(evidence.ci && validUrl(evidence.ci.runUrl), `${filePath}: ci.runUrl must be an HTTP(S) URL.`);
  assert(Array.isArray(evidence.jobs), `${filePath}: jobs must be an array.`);
  assert(Array.isArray(evidence.requirements), `${filePath}: requirements must be an array.`);

  const jobNames = new Set();
  for (const job of evidence.jobs) {
    assert(job && typeof job.name === "string" && job.name.length > 0, `${filePath}: every job needs a name.`);
    assert(!jobNames.has(job.name), `${filePath}: duplicate CI job ${job.name}.`);
    jobNames.add(job.name);
    assert(jobStatuses.has(job.status), `${filePath}: invalid CI status for ${job.name}.`);
    assert(validUrl(job.url), `${filePath}: ${job.name} must include a job URL.`);
    assert(job.commit === evidence.commit, `${filePath}: ${job.name} commit must match lane commit.`);
  }

  const requirementIds = new Set();
  for (const claim of evidence.requirements) {
    assert(claim && typeof claim.id === "string", `${filePath}: each requirement claim needs an id.`);
    assert(!requirementIds.has(claim.id), `${filePath}: duplicate requirement claim ${claim.id}.`);
    requirementIds.add(claim.id);
    assert(["PASS", "FAIL", "UNVERIFIED"].includes(claim.status), `${filePath}: invalid status for ${claim.id}.`);
    assert(Array.isArray(claim.commands), `${filePath}: ${claim.id}.commands must be an array.`);
    assert(Array.isArray(claim.ciJobs), `${filePath}: ${claim.id}.ciJobs must be an array.`);
    for (const jobName of claim.ciJobs) {
      assert(jobNames.has(jobName), `${filePath}: ${claim.id} references missing job ${jobName}.`);
    }
  }
}

function main() {
  const catalog = readJson(requirementsPath);
  assert(catalog.version === 1, "Unsupported audit requirements catalog version.");
  assert(Array.isArray(catalog.areas) && Array.isArray(catalog.requirements), "Catalog must contain areas and requirements.");
  assert(catalog.sources && typeof catalog.sources === "object", "Catalog must contain the grounded source register.");
  const weights = catalog.areas.reduce((total, area) => total + area.weight, 0);
  assert(weights === 100, `Area weights must sum to 100; found ${weights}.`);

  const areaIds = new Set(catalog.areas.map((area) => area.id));
  const requirementById = new Map();
  for (const requirement of catalog.requirements) {
    assert(areaIds.has(requirement.area), `${requirement.id}: unknown area ${requirement.area}.`);
    assert(lanes.includes(requirement.owner), `${requirement.id}: unknown owner lane ${requirement.owner}.`);
    assert(!requirementById.has(requirement.id), `Duplicate catalog requirement ${requirement.id}.`);
    assert(Array.isArray(requirement.source) && requirement.source.length > 0, `${requirement.id}: source must cite at least one explicit baseline or owner clarification.`);
    for (const sourceId of requirement.source) {
      assert(typeof catalog.sources[sourceId] === "string", `${requirement.id}: source ${sourceId} is not in the source register.`);
    }
    requirementById.set(requirement.id, requirement);
  }

  const laneEvidence = {};
  const claims = new Map();
  const driftAndConflicts = [];
  const lanesMissingEvidence = [];

  for (const lane of lanes) {
    const filePath = path.join(evidenceDirectory, `${lane}.json`);
    if (!fs.existsSync(filePath)) {
      lanesMissingEvidence.push(lane);
      laneEvidence[lane] = {
        status: "UNVERIFIED",
        commit: null,
        ciRunUrl: null,
        jobs: [],
        missingEvidenceFile: `docs/AUDIT/evidence/${lane}.json`,
      };
      continue;
    }

    const evidence = readJson(filePath);
    validateLaneEvidence(evidence, lane, filePath);
    laneEvidence[lane] = {
      status: "RECORDED",
      commit: evidence.commit,
      ciRunUrl: evidence.ci.runUrl,
      jobs: evidence.jobs,
      requirements: evidence.requirements,
    };

    for (const claim of evidence.requirements) {
      const requirement = requirementById.get(claim.id);
      if (!requirement) {
        driftAndConflicts.push({ type: "UNKNOWN_REQUIREMENT", lane, requirementId: claim.id, detail: "Claim is not present in the canonical catalog." });
        continue;
      }
      if (requirement.owner !== lane) {
        driftAndConflicts.push({
          type: "OWNERSHIP_CONFLICT",
          lane,
          expectedOwner: requirement.owner,
          requirementId: claim.id,
          detail: "Lane evidence claims a requirement owned by another lane.",
        });
      }
      const existing = claims.get(claim.id) ?? [];
      existing.push({ lane, claim, evidence });
      claims.set(claim.id, existing);
    }
  }

  const requirementResults = catalog.requirements.map((requirement) => {
    const entries = claims.get(requirement.id) ?? [];
    const ownerClaim = entries.find((entry) => entry.lane === requirement.owner);
    const allClaimsPass = entries.length > 0 && entries.every((entry) => entry.claim.status === "PASS");
    const ownerIsOnlyClaimant = entries.every((entry) => entry.lane === requirement.owner);
    const claim = ownerClaim?.claim;
    const lane = ownerClaim?.evidence;
    const jobs = new Map((lane?.jobs ?? []).map((job) => [job.name, job]));
    const hasCommands = Array.isArray(claim?.commands) && claim.commands.some((command) => typeof command === "string" && command.trim().length > 0);
    const referencesPassingJobs = Array.isArray(claim?.ciJobs) && claim.ciJobs.length > 0 && claim.ciJobs.every((jobName) => jobs.get(jobName)?.status === "PASS");
    const verified = Boolean(claim && claim.status === "PASS" && allClaimsPass && ownerIsOnlyClaimant && hasCommands && referencesPassingJobs);
    const status = verified ? "VERIFIED" : claim?.status === "FAIL" ? "FAIL" : "UNVERIFIED";

    if (claim?.status === "PASS" && !verified) {
      driftAndConflicts.push({
        type: "UNSUPPORTED_PASS_CLAIM",
        lane: requirement.owner,
        requirementId: requirement.id,
        detail: "PASS requires a non-empty command transcript, passing CI job references, and no ownership conflict.",
      });
    }
    if (entries.length > 1 && new Set(entries.map((entry) => entry.claim.status)).size > 1) {
      driftAndConflicts.push({ type: "CLAIM_CONFLICT", requirementId: requirement.id, detail: "Lane reports disagree on requirement status; conservative result is not VERIFIED." });
    }

    return {
      ...requirement,
      sourceDetails: requirement.source.map((sourceId) => ({ id: sourceId, statement: catalog.sources[sourceId] })),
      status,
      evidence: claim ? {
        lane: requirement.owner,
        commit: lane.commit,
        commands: claim.commands,
        ciJobs: claim.ciJobs,
        detail: claim.detail ?? null,
      } : null,
      claimants: entries.map((entry) => ({ lane: entry.lane, status: entry.claim.status })),
    };
  });

  const areaScores = catalog.areas.map((area) => {
    const areaRequirements = requirementResults.filter((requirement) => requirement.area === area.id);
    const verifiedCount = areaRequirements.filter((requirement) => requirement.status === "VERIFIED").length;
    const rawScorePct = areaRequirements.length === 0 ? 0 : (verifiedCount / areaRequirements.length) * 100;
    return {
      id: area.id,
      area: area.label,
      weight: area.weight,
      verified: verifiedCount,
      total: areaRequirements.length,
      denominatorStatus: areaRequirements.length > 0 && areaRequirements.every((requirement) => requirement.sourceDetails?.length > 0) ? "GROUNDED" : "NOT_SCORABLE",
      scorePct: shortScore(rawScorePct),
      weightedContribution: shortScore((rawScorePct * area.weight) / 100),
    };
  });
  const allDenominatorsGrounded = areaScores.every((area) => area.denominatorStatus === "GROUNDED");
  const rawOverallScore = areaScores.reduce((total, area) => total + ((area.total === 0 ? 0 : area.verified / area.total) * area.weight), 0);
  const overallScore = shortScore(rawOverallScore);
  const openIssues = requirementResults
    .filter((requirement) => requirement.status !== "VERIFIED")
    .map((requirement) => ({
      id: requirement.id,
      severity: requirement.severity,
      owner: requirement.owner,
      humanOnly: requirement.humanOnly === true,
      status: requirement.status,
      summary: requirement.summary,
    }));
  const openCriticalCount = openIssues.filter((issue) => issue.severity === "Critical").length;
  const areaFloorMet = areaScores.every((area) => area.scorePct >= 70);
  const scoreFloorMet = allDenominatorsGrounded && overallScore >= 80;
  const zeroCriticalMet = openCriticalCount === 0;

  let currentCommit = "UNKNOWN";
  try {
    currentCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  } catch {
    // A source archive without .git is still auditable; the lane commits remain authoritative.
  }

  const report = {
    generatedAt: new Date().toISOString(),
    repositoryCommit: currentCommit,
    scoring: {
      method: "verified canonical requirements per area; weighted by configured area weight",
      rounding: "floor to two decimal places; never round up",
      overallPct: overallScore,
      denominatorStatus: allDenominatorsGrounded ? "GROUNDED" : "NOT_SCORABLE",
      thresholds: { overallAtLeast80: scoreFloorMet, everyAreaAtLeast70: areaFloorMet, zeroOpenCritical: zeroCriticalMet },
      verdict: scoreFloorMet && areaFloorMet && zeroCriticalMet ? "PASS" : "FAIL",
    },
    scoreTable: areaScores,
    laneEvidence,
    requirementResults,
    driftAndConflicts,
    missingLaneEvidence: lanesMissingEvidence.map((lane) => ({ lane, path: `docs/AUDIT/evidence/${lane}.json`, status: "UNVERIFIED" })),
    openIssues,
    humanActions: openIssues.filter((issue) => issue.humanOnly),
  };

  fs.mkdirSync(auditDirectory, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderMarkdown(report), "utf8");
  console.log(`Wrote ${path.relative(repositoryRoot, markdownPath)} and ${path.relative(repositoryRoot, jsonPath)}.`);
  console.log(`Audit verdict: ${report.scoring.verdict}; overall ${report.scoring.overallPct}%; ${openCriticalCount} open Critical issue(s).`);
}

function renderMarkdown(report) {
  const lines = [
    "# SSVM ERP Consolidated Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Repository commit: \`${report.repositoryCommit}\``,
    `Verdict: **${report.scoring.verdict}** — overall **${report.scoring.overallPct}%** (score is floored, never rounded up).`,
    "",
    "## Thresholds",
    "",
    "| Check | Result |",
    "|---|---|",
    `| Overall >= 80 | ${report.scoring.thresholds.overallAtLeast80 ? "PASS" : "FAIL"} |`,
    `| Every area >= 70 | ${report.scoring.thresholds.everyAreaAtLeast70 ? "PASS" : "FAIL"} |`,
    `| Zero open Critical issues | ${report.scoring.thresholds.zeroOpenCritical ? "PASS" : "FAIL"} |`,
    "",
    "## Score table",
    "",
    "| Area | Weight | Verified / denominator | Denominator | Score | Weighted contribution |",
    "|---|---:|---:|---|---:|---:|",
    ...report.scoreTable.map((area) => `| ${area.area} | ${area.weight} | ${area.verified}/${area.total} | ${area.denominatorStatus} | ${area.scorePct}% | ${area.weightedContribution} |`),
    `| **Overall** | **100** |  | **${report.scoring.overallPct}%** | **${report.scoring.overallPct}** |`,
    "",
    "## Per-lane evidence",
    "",
  ];

  for (const lane of Object.keys(report.laneEvidence)) {
    const evidence = report.laneEvidence[lane];
    lines.push(`### Lane ${lane}`, "", `- Status: **${evidence.status}**`, `- Commit: ${evidence.commit ? `\`${evidence.commit}\`` : "UNVERIFIED"}`, `- CI run: ${evidence.ciRunUrl ? `[${evidence.ciRunUrl}](${evidence.ciRunUrl})` : "UNVERIFIED"}`);
    if (evidence.missingEvidenceFile) lines.push(`- Evidence file missing: \`${evidence.missingEvidenceFile}\``);
    if (evidence.jobs.length === 0) {
      lines.push("- Jobs: UNVERIFIED");
    } else {
      lines.push("- Jobs:");
      for (const job of evidence.jobs) lines.push(`  - ${job.name}: **${job.status}** — [job](${job.url})${job.detail ? ` — ${job.detail}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## Drift and conflicts", "");
  if (report.driftAndConflicts.length === 0) lines.push("No evidence conflicts reported.", "");
  else for (const item of report.driftAndConflicts) lines.push(`- **${item.type}**${item.requirementId ? ` (${item.requirementId})` : ""}: ${item.detail}`);
  if (report.driftAndConflicts.length > 0) lines.push("");
  if (report.missingLaneEvidence.length > 0) {
    lines.push("Missing lane evidence files:", "", ...report.missingLaneEvidence.map((item) => `- Lane ${item.lane}: \`${item.path}\` (${item.status})`), "");
  }

  lines.push("## Open issues by severity", "");
  for (const severity of ["Critical", "High", "Medium", "Low"]) {
    const issues = report.openIssues.filter((issue) => issue.severity === severity);
    lines.push(`### ${severity} (${issues.length})`, "");
    if (issues.length === 0) lines.push("None.", "");
    else for (const issue of issues) lines.push(`- \`${issue.id}\` — Lane ${issue.owner} — ${issue.status}${issue.humanOnly ? " — HUMAN ACTION" : ""}: ${issue.summary}`);
    if (issues.length > 0) lines.push("");
  }

  lines.push("## HUMAN ACTIONS", "");
  if (report.humanActions.length === 0) lines.push("None recorded.", "");
  else for (const action of report.humanActions) lines.push(`- \`${action.id}\` — ${action.status}: ${action.summary}`);
  if (report.humanActions.length > 0) lines.push("");

  lines.push("## Requirement evidence", "", "| ID | Area | Owner | Status | Grounding source | Evidence |", "|---|---|---|---|---|---|");
  for (const requirement of report.requirementResults) {
    const proof = requirement.evidence ? `${requirement.evidence.commit}; ${requirement.evidence.commands.join("; ")}; CI ${requirement.evidence.ciJobs.join(", ")}` : "UNVERIFIED: no lane claim";
    const source = requirement.sourceDetails.map((item) => `${item.id}: ${item.statement}`).join("; ");
    lines.push(`| ${requirement.id} | ${requirement.area} | ${requirement.owner} | ${requirement.status} | ${source.replaceAll("|", "\\|")} | ${proof.replaceAll("|", "\\|")} |`);
  }
  lines.push("");
  return lines.join("\n");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
