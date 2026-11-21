/**
 * ============================================================================
 * PAPER & LIGHT — VIRTUAL GENDER REVEAL GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * Timezone: Asia/Manila (Philippine Standard Time, UTC+8, no DST)
 *
 * Required Google Sheet Tabs & Header Columns (auto-initialized if missing):
 *   1. settings : reveal_time | gender | locked
 *   2. guesses  : name | side | relationship | guess | timestamp
 *   3. wishes   : name | guess | wish_for_baby | note_for_parents | timestamp
 *   4. names    : guest | suggested_name | timestamp
 *
 * Required Script Properties (Project Settings -> Script Properties):
 *   - APPS_SCRIPT_SECRET  : Shared secret matching Next.js APPS_SCRIPT_SECRET
 *   - PARENTS_SECRET_SLUG : Secret slug matching Next.js PARENTS_SECRET_SLUG
 */

var TIMEZONE = "Asia/Manila";
var STATE_CACHE_KEY = "PAPER_AND_LIGHT_PUBLIC_STATE_V1";
var STATE_CACHE_TTL_SEC = 4; // Short cache for high-concurrency polling bursts

function getManilaIsoNow(dateObj) {
  var d = dateObj || new Date();
  return Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss'+08:00'");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function verifyProxyToken(token) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty("APPS_SCRIPT_SECRET") || "";
  if (!expected) return false;
  return token === expected;
}

function verifyParentsSlug(slug) {
  var props = PropertiesService.getScriptProperties();
  var expected =
    props.getProperty("PARENTS_SLUG") ||
    props.getProperty("PARENTS_SECRET_SLUG") ||
    "";
  if (!expected || expected.length < 24) return false;
  return slug === expected;
}

var PROFANITY_REGEX =
  /\b(fuck|shit|bitch|asshole|cunt|dick|pussy|whore|slut|bastard|nigger|faggot|retard|putang\s*ina|putangina|tangina|gago|gaga|ulol|tarantado|tanga|bobo|boba|pakyu|hindot|kantot|kupal|punyeta|leche|bwisit)\b/i;

function cleanText(val, maxLen) {
  if (!val) return "";
  return String(val)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLen || 250);
}

function sanitizeFormula(val) {
  if (!val) return "";
  var str = String(val);
  var ch = str.charAt(0);
  if (
    ch === "=" ||
    ch === "+" ||
    ch === "-" ||
    ch === "@" ||
    ch === "\t" ||
    ch === "\r"
  ) {
    return "'" + str;
  }
  return str;
}

function isFlaggedProfanity(val) {
  if (!val) return false;
  return PROFANITY_REGEX.test(String(val));
}

function checkGuestRateLimit(deviceKey) {
  var cache = CacheService.getScriptCache();
  var key =
    "RL_" +
    Utilities.base64EncodeWebSafe(String(deviceKey || "anon")).slice(0, 40);
  if (cache.get(key)) {
    return false;
  }
  cache.put(key, "1", 2); // 2-second minimum spacing per device

  // Global burst guard (max ~45 writes per 10s window)
  var globalCount = Number(cache.get("RL_GLOBAL") || 0);
  if (globalCount >= 45) {
    return false;
  }
  cache.put("RL_GLOBAL", String(globalCount + 1), 10);
  return true;
}

function ensureSheetsStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cache = CacheService.getScriptCache();
  if (cache.get("SCHEMA_VERIFIED_V3") === "1") {
    return ss;
  }

  var schema = {
    settings: ["reveal_time", "gender", "locked"],
    guesses: [
      "name",
      "side",
      "relationship",
      "guess",
      "timestamp",
      "device_id",
      "late",
      "hidden",
      "flagged",
    ],
    wishes: [
      "name",
      "guess",
      "wish_for_baby",
      "note_for_parents",
      "timestamp",
      "hidden",
      "flagged",
      "device_id",
    ],
    names: ["guest", "suggested_name", "timestamp", "hidden", "flagged"],
  };

  Object.keys(schema).forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schema[tabName]);
      if (tabName === "settings") {
        sheet.appendRow(["2026-11-21T19:00:00+08:00", "", false]);
      } else {
        // Format guest text columns as plain text (@) to prevent formula evaluation
        sheet.getRange(2, 1, 500, schema[tabName].length).setNumberFormat("@");
      }
    } else if (tabName !== "settings") {
      // Backfill any newly added schema columns (device_id, late, hidden, flagged) onto existing tabs
      var lastCol = Math.max(1, sheet.getLastColumn());
      var existingHeaders = sheet
        .getRange(1, 1, 1, lastCol)
        .getValues()[0]
        .map(function (h) {
          return String(h || "").trim();
        });
      schema[tabName].forEach(function (colName) {
        if (existingHeaders.indexOf(colName) === -1) {
          var nextCol = existingHeaders.length + 1;
          sheet.getRange(1, nextCol).setValue(colName);
          existingHeaders.push(colName);
        }
      });
    }
  });

  cache.put("SCHEMA_VERIFIED_V3", "1", 3600);
  return ss;
}

function readSettingsRow(ss) {
  var sheet = ss.getSheetByName("settings");
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    var defaultTime = "2026-11-21T19:00:00+08:00";
    sheet.appendRow([defaultTime, "", false]);
    return { reveal_time: defaultTime, gender: null, locked: false };
  }
  var row = values[1];
  var rawTime = row[0] ? String(row[0]) : "2026-11-21T19:00:00+08:00";
  var rawGender = row[1] ? String(row[1]).toLowerCase() : "";
  var locked = row[2] === true || String(row[2]).toLowerCase() === "true";

  return {
    reveal_time: rawTime,
    gender: rawGender === "boy" || rawGender === "girl" ? rawGender : null,
    locked: locked,
  };
}

function isTrueCell(v) {
  return v === true || String(v).toLowerCase() === "true";
}

function readRowsAsObjects(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { _rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    result.push(obj);
  }
  return result;
}

function buildPublicState(ss) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(STATE_CACHE_KEY);
  var baseData;

  if (cached) {
    baseData = JSON.parse(cached);
  } else {
    var settings = readSettingsRow(ss);
    var allGuesses = readRowsAsObjects(ss, "guesses");
    var allNames = readRowsAsObjects(ss, "names");

    var visibleGuesses = allGuesses.filter(function (g) {
      return !isTrueCell(g.hidden);
    });
    var visibleNames = allNames.filter(function (n) {
      return !isTrueCell(n.hidden);
    });

    var boyCount = 0;
    var girlCount = 0;
    var motherCount = 0;
    var fatherCount = 0;
    var bothCount = 0;
    visibleGuesses.forEach(function (g) {
      if (g.guess === "boy") boyCount++;
      if (g.guess === "girl") girlCount++;
      var s = String(g.side || "both").toLowerCase();
      if (s === "mother") motherCount++;
      else if (s === "father") fatherCount++;
      else bothCount++;
    });

    baseData = {
      settings: settings,
      tally: {
        boy: boyCount,
        girl: girlCount,
        total: boyCount + girlCount,
      },
      sideCounts: {
        all: visibleGuesses.length,
        mother: motherCount,
        father: fatherCount,
        both: bothCount,
      },
      guesses: visibleGuesses.slice(-40),
      names: visibleNames.slice(-25).reverse(),
    };

    cache.put(STATE_CACHE_KEY, JSON.stringify(baseData), STATE_CACHE_TTL_SEC);
  }

  var now = new Date();
  var serverTimeIso = getManilaIsoNow(now);
  var revealDate = new Date(baseData.settings.reveal_time);
  var isTimeReached = now.getTime() >= revealDate.getTime();
  var isRevealed =
    isTimeReached &&
    baseData.settings.locked === true &&
    (baseData.settings.gender === "boy" || baseData.settings.gender === "girl");

  var response = {
    serverTime: serverTimeIso,
    revealTime: baseData.settings.reveal_time,
    timeReached: isTimeReached,
    revealed: isRevealed,
    locked: baseData.settings.locked,
    tally: baseData.tally,
    sideCounts: baseData.sideCounts,
    guestWall: baseData.guesses.map(function (g) {
      return {
        name: g.name,
        side: g.side || "both",
        relationship: g.relationship || "",
        guess: g.guess,
        timestamp: g.timestamp,
      };
    }),
    names: baseData.names.map(function (n) {
      return {
        guest: n.guest,
        suggested_name: n.suggested_name,
        timestamp: n.timestamp,
      };
    }),
    advice: [],
  };

  // CRITICAL: Gender is ONLY returned when serverTime >= reveal_time AND locked
  // Exclude late guesses from the Honor Roll
  if (isRevealed) {
    response.gender = baseData.settings.gender;
    response.correctGuessers = baseData.guesses
      .filter(function (g) {
        return g.guess === baseData.settings.gender && !isTrueCell(g.late);
      })
      .map(function (g) {
        return g.relationship ? g.name + " · " + g.relationship : g.name;
      });
  }

  return response;
}

function invalidateStateCache() {
  CacheService.getScriptCache().remove(STATE_CACHE_KEY);
}

function buildParentsDataPayload(ss) {
  var settings = readSettingsRow(ss);
  var guesses = readRowsAsObjects(ss, "guesses");
  var wishes = readRowsAsObjects(ss, "wishes").reverse();
  var names = readRowsAsObjects(ss, "names").reverse();

  var now = new Date();
  var revealDate = new Date(settings.reveal_time);
  var isRevealed =
    now.getTime() >= revealDate.getTime() &&
    settings.locked &&
    Boolean(settings.gender);

  var visibleGuesses = guesses.filter(function (g) {
    return !isTrueCell(g.hidden);
  });
  var boyCount = visibleGuesses.filter(function (g) {
    return g.guess === "boy";
  }).length;
  var girlCount = visibleGuesses.filter(function (g) {
    return g.guess === "girl";
  }).length;

  return {
    serverTime: getManilaIsoNow(now),
    revealTime: settings.reveal_time,
    locked: settings.locked,
    revealed: isRevealed,
    // Never leak the locked gender before reveal_time
    gender: isRevealed ? settings.gender : null,
    tally: {
      boy: boyCount,
      girl: girlCount,
      total: boyCount + girlCount,
    },
    guesses: guesses.map(function (g) {
      return {
        _rowIndex: g._rowIndex,
        name: g.name,
        side: g.side || "both",
        relationship: g.relationship || "",
        guess: g.guess,
        timestamp: g.timestamp,
        late: isTrueCell(g.late),
        hidden: isTrueCell(g.hidden),
        flagged: isTrueCell(g.flagged),
      };
    }),
    wishes: wishes.map(function (w) {
      return {
        _rowIndex: w._rowIndex,
        name: w.name,
        guess: w.guess,
        wish_for_baby: w.wish_for_baby,
        note_for_parents: w.note_for_parents,
        timestamp: w.timestamp,
        hidden: isTrueCell(w.hidden),
        flagged: isTrueCell(w.flagged),
      };
    }),
    names: names.map(function (n) {
      return {
        _rowIndex: n._rowIndex,
        guest: n.guest,
        suggested_name: n.suggested_name,
        timestamp: n.timestamp,
        hidden: isTrueCell(n.hidden),
        flagged: isTrueCell(n.flagged),
      };
    }),
    advice: [],
    correctGuessers: isRevealed
      ? visibleGuesses
          .filter(function (g) {
            return g.guess === settings.gender && !isTrueCell(g.late);
          })
          .map(function (g) {
            return g.relationship ? g.name + " · " + g.relationship : g.name;
          })
      : [],
  };
}

function checkIdempotencyKey(key) {
  if (!key) return false;
  var cache = CacheService.getScriptCache();
  var cacheKey =
    "IDEMP_" +
    String(key)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 48);
  return Boolean(cache.get(cacheKey));
}

function markIdempotencyKey(key) {
  if (!key) return;
  var cache = CacheService.getScriptCache();
  var cacheKey =
    "IDEMP_" +
    String(key)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 48);
  cache.put(cacheKey, "1", 600); // 10 minutes
}

/**
 * HTTP GET Handler (doGet) — kept minimal; all secret-authenticated calls use POST
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (!verifyProxyToken(params.token)) {
      return jsonResponse({ error: "Unauthorized proxy token" });
    }

    var ss = ensureSheetsStructure();
    var action = params.action || "getState";

    if (action === "getState") {
      return jsonResponse(buildPublicState(ss));
    }

    if (action === "getParentsData") {
      if (!verifyParentsSlug(params.slug)) {
        return jsonResponse({ error: "Not found" });
      }
      return jsonResponse(buildParentsDataPayload(ss));
    }

    return jsonResponse({ error: "Unknown GET action" });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/**
 * HTTP POST Handler (doPost)
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!verifyProxyToken(body.token)) {
      return jsonResponse({ error: "Unauthorized proxy token" });
    }

    // Honeypot validation
    if (body._hp && String(body._hp).length > 0) {
      return jsonResponse({ ok: true });
    }

    var ss = ensureSheetsStructure();
    var action = body.action || "";
    var nowIso = getManilaIsoNow(new Date());

    // Read Actions (via POST so secret token is never in URL query strings)
    if (action === "getState") {
      return jsonResponse(buildPublicState(ss));
    }

    if (action === "getParentsData") {
      if (!verifyParentsSlug(body.slug)) {
        return jsonResponse({ error: "Not found" });
      }
      return jsonResponse(buildParentsDataPayload(ss));
    }

    if (action === "getMyWish") {
      var myDevId = cleanText(body.deviceId, 64);
      var myNameBase = cleanText(body.name, 40)
        .split("·")[0]
        .trim()
        .toLowerCase();
      var wSheet = ss.getSheetByName("wishes");
      if (!wSheet) return jsonResponse({ ok: true, wish: null });
      var wRows = wSheet.getDataRange().getValues();
      var wHeads = wRows[0] || [];
      var devIdx = wHeads.indexOf("device_id");
      for (var r = wRows.length - 1; r >= 1; r--) {
        var rDev = devIdx >= 0 ? String(wRows[r][devIdx] || "") : "";
        var rNameFull = String(wRows[r][0] || "").trim().toLowerCase();
        var rNameBase = rNameFull.split("·")[0].trim();
        if (
          (myDevId && rDev && rDev === myDevId) ||
          (myNameBase && (rNameFull === myNameBase || rNameBase === myNameBase))
        ) {
          return jsonResponse({
            ok: true,
            wish: {
              wish_for_baby: String(wRows[r][2] || ""),
              note_for_parents: String(wRows[r][3] || ""),
            },
          });
        }
      }
      return jsonResponse({ ok: true, wish: null });
    }

    // Guest Actions (Wrapped in LockService + Idempotency Key + Rate Limit + Formula Guard + Moderation)
    if (
      action === "submitGuess" ||
      action === "submitWish" ||
      action === "submitName"
    ) {
      var idempKey = cleanText(body.idempotencyKey, 64);
      if (idempKey && checkIdempotencyKey(idempKey)) {
        return jsonResponse({ ok: true, deduplicated: true });
      }

      var rateKey =
        cleanText(body.deviceId, 64) || cleanText(body.name, 40) || "anon";
      if (!checkGuestRateLimit(rateKey + "_" + action)) {
        return jsonResponse({
          error: "Please slow down a moment and try again.",
          retryable: true,
        });
      }

      var guestLock = LockService.getScriptLock();
      try {
        guestLock.waitLock(8000);
      } catch (lockErr) {
        return jsonResponse({
          error: "BUSY_RETRY",
          retryable: true,
          message: "Server is busy, please retry in a moment.",
        });
      }

      try {
        if (idempKey && checkIdempotencyKey(idempKey)) {
          return jsonResponse({ ok: true, deduplicated: true });
        }

        var currentSettings = readSettingsRow(ss);
        var revealMs = new Date(currentSettings.reveal_time).getTime();
        var isLateSubmission =
          !isNaN(revealMs) && new Date().getTime() >= revealMs;

        if (action === "submitGuess") {
          var name = cleanText(body.name, 40);
          var rawSide = String(body.side || "both").toLowerCase();
          var side =
            rawSide === "mother"
              ? "mother"
              : rawSide === "father"
                ? "father"
                : "both";
          var relationship = cleanText(body.relationship, 50);
          var guess = body.guess === "boy" ? "boy" : "girl";
          var deviceId = cleanText(body.deviceId, 64);
          if (!name) return jsonResponse({ error: "Name required" });

          var flaggedGuess =
            isFlaggedProfanity(name) || isFlaggedProfanity(relationship);
          var hiddenGuess = flaggedGuess;
          var safeName = sanitizeFormula(name);
          var safeRel = sanitizeFormula(relationship);

          var guessSheet = ss.getSheetByName("guesses");
          var existingRows = guessSheet.getDataRange().getValues();
          var normName = name.toLowerCase();
          var matchedRowIdx = -1;

          for (var r = 1; r < existingRows.length; r++) {
            var rowName = String(existingRows[r][0] || "")
              .trim()
              .toLowerCase();
            var rowDevice = String(existingRows[r][5] || "").trim();
            if (
              (deviceId && rowDevice && rowDevice === deviceId) ||
              (!rowDevice && rowName === normName)
            ) {
              matchedRowIdx = r + 1; // 1-based sheet row
              break;
            }
          }

          if (matchedRowIdx > 1) {
            guessSheet
              .getRange(matchedRowIdx, 1, 1, 9)
              .setValues([
                [
                  safeName,
                  side,
                  safeRel,
                  guess,
                  nowIso,
                  deviceId,
                  isLateSubmission,
                  hiddenGuess,
                  flaggedGuess,
                ],
              ]);
          } else {
            guessSheet.appendRow([
              safeName,
              side,
              safeRel,
              guess,
              nowIso,
              deviceId,
              isLateSubmission,
              hiddenGuess,
              flaggedGuess,
            ]);
          }

          markIdempotencyKey(idempKey);
          invalidateStateCache();
          return jsonResponse({ ok: true, flagged: flaggedGuess });
        }

        if (action === "submitWish") {
          var wName = cleanText(body.name, 40) || "Guest";
          var wGuess =
            body.guess === "boy" || body.guess === "girl" ? body.guess : "";
          var wishForBaby = cleanText(body.wish_for_baby, 25000);
          var noteForParents = cleanText(body.note_for_parents, 25000);
          var wDeviceId = cleanText(body.deviceId, 64);
          if (!wishForBaby) return jsonResponse({ error: "Wish required" });

          var flaggedWish =
            isFlaggedProfanity(wName) ||
            isFlaggedProfanity(wishForBaby) ||
            isFlaggedProfanity(noteForParents);

          var wishesSheet = ss.getSheetByName("wishes");
          var wishRows = wishesSheet.getDataRange().getValues();
          var wishHeaders = wishRows[0] || [];
          var wDevColIdx = wishHeaders.indexOf("device_id");
          var existingWishRow = -1;
          var normalizedWName = wName.toLowerCase();
          var normalizedWBase = normalizedWName.split("·")[0].trim();

          for (var wr = wishRows.length - 1; wr >= 1; wr--) {
            var rowWDev = wDevColIdx >= 0 ? String(wishRows[wr][wDevColIdx] || "") : "";
            var rowWName = String(wishRows[wr][0] || "").trim().toLowerCase();
            var rowWBase = rowWName.split("·")[0].trim();
            if (
              (wDeviceId && rowWDev && rowWDev === wDeviceId) ||
              (normalizedWBase &&
                (rowWName === normalizedWName || rowWBase === normalizedWBase))
            ) {
              existingWishRow = wr + 1;
              break;
            }
          }

          if (existingWishRow > 1) {
            wishesSheet
              .getRange(existingWishRow, 1, 1, 8)
              .setValues([
                [
                  sanitizeFormula(wName),
                  wGuess,
                  sanitizeFormula(wishForBaby),
                  sanitizeFormula(noteForParents),
                  nowIso,
                  flaggedWish,
                  flaggedWish,
                  wDeviceId,
                ],
              ]);
          } else {
            wishesSheet.appendRow([
              sanitizeFormula(wName),
              wGuess,
              sanitizeFormula(wishForBaby),
              sanitizeFormula(noteForParents),
              nowIso,
              flaggedWish,
              flaggedWish,
              wDeviceId,
            ]);
          }
          markIdempotencyKey(idempKey);
          return jsonResponse({ ok: true, flagged: flaggedWish });
        }

        if (action === "submitName") {
          var nGuest = cleanText(body.guest, 40) || "Guest";
          var suggested = cleanText(body.suggested_name, 30);
          if (!suggested) {
            return jsonResponse({ error: "Name suggestion required" });
          }

          var flaggedName =
            isFlaggedProfanity(nGuest) || isFlaggedProfanity(suggested);

          ss.getSheetByName("names").appendRow([
            sanitizeFormula(nGuest),
            sanitizeFormula(suggested),
            nowIso,
            flaggedName,
            flaggedName,
          ]);
          markIdempotencyKey(idempKey);
          invalidateStateCache();
          return jsonResponse({ ok: true, flagged: flaggedName });
        }
      } finally {
        guestLock.releaseLock();
      }
    }

    // Parents Actions (Require secret slug)
    if (
      action === "setRevealTime" ||
      action === "revealNow" ||
      action === "setGender" ||
      action === "resetGenderLock" ||
      action === "toggleHideEntry"
    ) {
      if (!verifyParentsSlug(body.slug)) {
        return jsonResponse({ error: "Not found" });
      }

      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        var settingsSheet = ss.getSheetByName("settings");
        var current = readSettingsRow(ss);

        if (action === "setRevealTime" || action === "revealNow") {
          var nextTime = cleanText(body.revealTime, 40) || nowIso;
          settingsSheet.getRange(2, 1).setValue(nextTime);
          invalidateStateCache();
          appendAuditLog_(ss, action, nextTime);
          return jsonResponse({ ok: true, revealTime: nextTime });
        }

        if (action === "toggleHideEntry") {
          var tab = String(body.tab || "");
          var rowIdx = Number(body.rowIndex || 0);
          var nextHidden = Boolean(body.hidden);
          if (
            (tab !== "guesses" && tab !== "wishes" && tab !== "names") ||
            rowIdx < 2
          ) {
            return jsonResponse({ error: "Invalid entry reference" });
          }
          var targetSheet = ss.getSheetByName(tab);
          if (!targetSheet || rowIdx > targetSheet.getLastRow()) {
            return jsonResponse({ error: "Row not found" });
          }
          var tLastCol = Math.max(1, targetSheet.getLastColumn());
          var tHeaders = targetSheet
            .getRange(1, 1, 1, tLastCol)
            .getValues()[0]
            .map(function (h) {
              return String(h || "").trim();
            });
          var colNum = tHeaders.indexOf("hidden") + 1;
          if (colNum <= 0) {
            colNum = tHeaders.length + 1;
            targetSheet.getRange(1, colNum).setValue("hidden");
          }
          targetSheet.getRange(rowIdx, colNum).setValue(nextHidden);
          invalidateStateCache();
          appendAuditLog_(ss, action, tab + ":" + rowIdx + "=" + nextHidden);
          return jsonResponse({ ok: true, hidden: nextHidden });
        }

        if (action === "resetGenderLock") {
          var currentRevealMs = new Date(current.reveal_time).getTime();
          if (
            !isNaN(currentRevealMs) &&
            new Date().getTime() >= currentRevealMs
          ) {
            return jsonResponse({
              error: "Cannot change gender after the reveal time has arrived.",
            });
          }
          settingsSheet.getRange(2, 2).setValue("");
          settingsSheet.getRange(2, 3).setValue(false);
          invalidateStateCache();
          appendAuditLog_(ss, action, "unlocked");
          return jsonResponse({ ok: true, locked: false });
        }

        if (action === "setGender") {
          if (current.locked) {
            return jsonResponse({
              error: "Gender is already locked and cannot be modified.",
            });
          }
          var chosenGender =
            body.gender === "boy"
              ? "boy"
              : body.gender === "girl"
                ? "girl"
                : null;
          if (!chosenGender) {
            return jsonResponse({ error: "Invalid gender choice" });
          }
          settingsSheet.getRange(2, 2).setValue(chosenGender);
          settingsSheet.getRange(2, 3).setValue(true);
          invalidateStateCache();
          appendAuditLog_(ss, action, "locked");
          return jsonResponse({ ok: true, locked: true });
        }
      } finally {
        lock.releaseLock();
      }
    }

    if (action === "health") {
      var settingsHealth = readSettingsRow(ss);
      return jsonResponse({
        ok: true,
        serverTime: new Date().toISOString(),
        locked: settingsHealth.locked,
        tabsOk: Boolean(
          ss.getSheetByName("settings") &&
          ss.getSheetByName("guesses") &&
          ss.getSheetByName("wishes") &&
          ss.getSheetByName("names"),
        ),
      });
    }

    return jsonResponse({ error: "Unknown POST action" });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/**
 * Writes a lightweight audit record into a hidden `logs` tab, capped at 500 rows.
 */
function appendAuditLog_(ss, action, detail) {
  try {
    var sheet = ss.getSheetByName("logs");
    if (!sheet) {
      sheet = ss.insertSheet("logs");
      sheet.hideSheet();
      sheet.appendRow(["timestamp", "action", "detail"]);
    }
    sheet.appendRow([
      new Date().toISOString(),
      String(action),
      String(detail || ""),
    ]);
    var lastRow = sheet.getLastRow();
    if (lastRow > 501) {
      sheet.deleteRows(2, lastRow - 501);
    }
  } catch (e) {
    // Never fail a parent action if audit logging fails
  }
}

/**
 * Hourly time-driven trigger target: saves a dated spreadsheet snapshot into
 * Google Drive -> "Paper & Light Backups" and keeps the latest 24 snapshots.
 */
function backupSnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folderName = "Paper & Light Backups";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(folderName);

  var stamp = Utilities.formatDate(
    new Date(),
    "Asia/Manila",
    "yyyy-MM-dd_HHmm",
  );  
  var copyName = ss.getName() + " - Backup " + stamp;
  DriveApp.getFileById(ss.getId()).makeCopy(copyName, folder);

  // Keep only the 24 most recent backups
  var files = [];
  var iter = folder.getFiles();
  while (iter.hasNext()) {
    files.push(iter.next());
  }
  if (files.length > 24) {
    files.sort(function (a, b) {
      return b.getDateCreated().getTime() - a.getDateCreated().getTime();
    });
    for (var i = 24; i < files.length; i++) {
      files[i].setTrashed(true);
    }
  }
}
