const STORAGE_USER = "tmv_authenticated_game";
const STORAGE_PASS_PREFIX = "tmv_password_ok_";

async function loadGames() {
  const res = await fetch("data/games.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load vault data.");
  return res.json();
}

function normalizeSegment(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function segmentMatches(expected, entered) {
  const e = normalizeSegment(expected);
  const g = normalizeSegment(entered);
  if (e === "" && g === "") return true;
  if (e === "7") return g === "7" || g === "07";
  return e === g;
}

function getPasswordCellCount(game) {
  const segs = game.passwordSegments;
  if (!Array.isArray(segs) || segs.length === 0) return 0;
  return segs.length;
}

function getMaxCharsPerCell(game) {
  const n = Number(game.passwordMaxCharsPerCell);
  if (Number.isFinite(n) && n >= 1 && n <= 8) return n;
  return 2;
}

/** Short hint under each password box (by expected answer length). */
function getPassCellLengthHint(expectedSegment, maxCharsPerCell) {
  let maxC = Number(maxCharsPerCell);
  if (!Number.isFinite(maxC) || maxC < 1 || maxC > 8) maxC = 2;
  const raw = String(expectedSegment ?? "").trim();
  const n = raw.length;
  if (maxC <= 1) return "1 character";
  if (n >= 2) return String(Math.min(n, maxC)) + " characters";
  if (n === 1) return "1 character";
  return "Up to " + maxC + " characters";
}

function checkPassword(game, segmentsFromInputs) {
  const expected = game.passwordSegments || [];
  const n = expected.length;
  if (n === 0) return false;
  for (let i = 0; i < n; i++) {
    const exp = expected[i] ?? "";
    const got = segmentsFromInputs[i] ?? "";
    if (!segmentMatches(exp, got)) return false;
  }
  if (segmentsFromInputs.length > n) {
    for (let j = n; j < segmentsFromInputs.length; j++) {
      if (String(segmentsFromInputs[j] || "").trim() !== "") return false;
    }
  }
  return true;
}

function setPasswordUnlocked(gameId) {
  sessionStorage.setItem(STORAGE_PASS_PREFIX + gameId, "1");
}

function isPasswordUnlocked(gameId) {
  return sessionStorage.getItem(STORAGE_PASS_PREFIX + gameId) === "1";
}

function setUserGate(gameId) {
  sessionStorage.setItem(STORAGE_USER, gameId);
}

function getUserGate() {
  return sessionStorage.getItem(STORAGE_USER);
}

function clearVaultSession() {
  sessionStorage.removeItem(STORAGE_USER);
  Object.keys(sessionStorage).forEach((k) => {
    if (k.startsWith(STORAGE_PASS_PREFIX)) sessionStorage.removeItem(k);
  });
}
