/**
 * ============================================================================
 * PAPER & LIGHT — VIRTUAL GENDER REVEAL GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ============================================================================
 * Timezone: Asia/Manila (Philippine Standard Time, UTC+8, no DST)
 *
 * Required Google Sheet Tabs & Header Columns (auto-initialized if missing):
 *   1. settings : reveal_time | gender | locked
 *   2. guesses  : name | guess | timestamp
 *   3. wishes   : name | wish_for_baby | note_for_parents | timestamp
 *   4. names    : guest | suggested_name | timestamp
 *   5. advice   : guest | advice | timestamp
 *
 * Required Script Properties (Project Settings -> Script Properties):
 *   - APPS_SCRIPT_SECRET  : Shared secret matching Next.js APPS_SCRIPT_SECRET
 *   - PARENTS_SECRET_SLUG : Secret slug matching Next.js PARENTS_SECRET_SLUG
 */

var TIMEZONE = 'Asia/Manila';
var STATE_CACHE_KEY = 'PAPER_AND_LIGHT_PUBLIC_STATE_V1';
var STATE_CACHE_TTL_SEC = 4; // Short cache for high-concurrency polling bursts

function getManilaIsoNow(dateObj) {
  var d = dateObj || new Date();
  return Utilities.formatDate(d, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss'+08:00'");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function verifyProxyToken(token) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('APPS_SCRIPT_SECRET') || '';
  if (!expected) return false;
  return token === expected;
}

function verifyParentsSlug(slug) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('PARENTS_SECRET_SLUG') || '';
  if (!expected) return false;
  return slug === expected;
}

function cleanText(val, maxLen) {
  if (!val) return '';
  return String(val)
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLen || 250);
}

function checkGuestRateLimit(identifier) {
  var cache = CacheService.getScriptCache();
  var key = 'RL_' + Utilities.base64EncodeWebSafe(String(identifier)).slice(0, 40);
  if (cache.get(key)) {
    return false;
  }
  cache.put(key, '1', 2); // 2-second minimum spacing per guest identifier
  return true;
}

function ensureSheetsStructure() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var schema = {
    settings: ['reveal_time', 'gender', 'locked'],
    guesses: ['name', 'guess', 'timestamp'],
    wishes: ['name', 'wish_for_baby', 'note_for_parents', 'timestamp'],
    names: ['guest', 'suggested_name', 'timestamp'],
    advice: ['guest', 'advice', 'timestamp'],
  };

  Object.keys(schema).forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schema[tabName]);
      if (tabName === 'settings') {
        sheet.appendRow(['2026-11-21T19:00:00+08:00', '', false]);
      }
    }
  });

  return ss;
}

function readSettingsRow(ss) {
  var sheet = ss.getSheetByName('settings');
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    var defaultTime = '2026-11-21T19:00:00+08:00';
    sheet.appendRow([defaultTime, '', false]);
    return { reveal_time: defaultTime, gender: null, locked: false };
  }
  var row = values[1];
  var rawTime = row[0] ? String(row[0]) : '2026-11-21T19:00:00+08:00';
  var rawGender = row[1] ? String(row[1]).toLowerCase() : '';
  var locked = row[2] === true || String(row[2]).toLowerCase() === 'true';

  return {
    reveal_time: rawTime,
    gender: rawGender === 'boy' || rawGender === 'girl' ? rawGender : null,
    locked: locked,
  };
}

function readRowsAsObjects(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var result = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
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
    var guesses = readRowsAsObjects(ss, 'guesses');
    var names = readRowsAsObjects(ss, 'names');
    var advice = readRowsAsObjects(ss, 'advice');

    var boyCount = 0;
    var girlCount = 0;
    guesses.forEach(function (g) {
      if (g.guess === 'boy') boyCount++;
      if (g.guess === 'girl') girlCount++;
    });

    baseData = {
      settings: settings,
      tally: {
        boy: boyCount,
        girl: girlCount,
        total: boyCount + girlCount,
      },
      guesses: guesses.slice(-40),
      names: names.slice(-25).reverse(),
      advice: advice.slice(-25).reverse(),
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
    (baseData.settings.gender === 'boy' || baseData.settings.gender === 'girl');

  var response = {
    serverTime: serverTimeIso,
    revealTime: baseData.settings.reveal_time,
    timeReached: isTimeReached,
    revealed: isRevealed,
    locked: baseData.settings.locked,
    tally: baseData.tally,
    guestWall: baseData.guesses.map(function (g) {
      var item = { name: g.name, timestamp: g.timestamp };
      if (isRevealed) item.guess = g.guess;
      return item;
    }),
    names: baseData.names,
    advice: baseData.advice,
  };

  // CRITICAL: Gender is ONLY returned when serverTime >= reveal_time AND locked
  if (isRevealed) {
    response.gender = baseData.settings.gender;
    response.correctGuessers = baseData.guesses
      .filter(function (g) {
        return g.guess === baseData.settings.gender;
      })
      .map(function (g) {
        return g.name;
      });
  }

  return response;
}

function invalidateStateCache() {
  CacheService.getScriptCache().remove(STATE_CACHE_KEY);
}

/**
 * HTTP GET Handler (doGet)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (!verifyProxyToken(params.token)) {
      return jsonResponse({ error: 'Unauthorized proxy token' });
    }

    var ss = ensureSheetsStructure();
    var action = params.action || 'getState';

    if (action === 'getState') {
      return jsonResponse(buildPublicState(ss));
    }

    if (action === 'getParentsData') {
      if (!verifyParentsSlug(params.slug)) {
        return jsonResponse({ error: 'Not found' });
      }
      var settings = readSettingsRow(ss);
      var guesses = readRowsAsObjects(ss, 'guesses');
      var wishes = readRowsAsObjects(ss, 'wishes').reverse();
      var names = readRowsAsObjects(ss, 'names').reverse();
      var advice = readRowsAsObjects(ss, 'advice').reverse();

      var now = new Date();
      var revealDate = new Date(settings.reveal_time);
      var isRevealed =
        now.getTime() >= revealDate.getTime() &&
        settings.locked &&
        Boolean(settings.gender);

      var boyCount = guesses.filter(function (g) {
        return g.guess === 'boy';
      }).length;
      var girlCount = guesses.filter(function (g) {
        return g.guess === 'girl';
      }).length;

      return jsonResponse({
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
        guesses: guesses,
        wishes: wishes,
        names: names,
        advice: advice,
        correctGuessers: isRevealed
          ? guesses
              .filter(function (g) {
                return g.guess === settings.gender;
              })
              .map(function (g) {
                return g.name;
              })
          : [],
      });
    }

    return jsonResponse({ error: 'Unknown GET action' });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/**
 * HTTP POST Handler (doPost)
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!verifyProxyToken(body.token)) {
      return jsonResponse({ error: 'Unauthorized proxy token' });
    }

    // Honeypot validation
    if (body._hp && String(body._hp).length > 0) {
      return jsonResponse({ ok: true });
    }

    var ss = ensureSheetsStructure();
    var action = body.action || '';
    var nowIso = getManilaIsoNow(new Date());

    // Guest Actions
    if (action === 'submitGuess') {
      var name = cleanText(body.name, 60);
      var guess = body.guess === 'boy' ? 'boy' : 'girl';
      if (!name) return jsonResponse({ error: 'Name required' });
      if (!checkGuestRateLimit('guess_' + name)) {
        return jsonResponse({ error: 'Rate limit exceeded' });
      }
      ss.getSheetByName('guesses').appendRow([name, guess, nowIso]);
      invalidateStateCache();
      return jsonResponse({ ok: true });
    }

    if (action === 'submitWish') {
      var wName = cleanText(body.name, 60) || 'Guest';
      var wishForBaby = cleanText(body.wish_for_baby, 600);
      var noteForParents = cleanText(body.note_for_parents, 600);
      if (!wishForBaby) return jsonResponse({ error: 'Wish required' });
      if (!checkGuestRateLimit('wish_' + wName)) {
        return jsonResponse({ error: 'Rate limit exceeded' });
      }
      ss.getSheetByName('wishes').appendRow([
        wName,
        wishForBaby,
        noteForParents,
        nowIso,
      ]);
      return jsonResponse({ ok: true });
    }

    if (action === 'submitName') {
      var nGuest = cleanText(body.guest, 60) || 'Guest';
      var suggested = cleanText(body.suggested_name, 80);
      if (!suggested) return jsonResponse({ error: 'Name suggestion required' });
      ss.getSheetByName('names').appendRow([nGuest, suggested, nowIso]);
      invalidateStateCache();
      return jsonResponse({ ok: true });
    }

    if (action === 'submitAdvice') {
      var aGuest = cleanText(body.guest, 60) || 'Guest';
      var adviceText = cleanText(body.advice, 400);
      if (!adviceText) return jsonResponse({ error: 'Advice required' });
      ss.getSheetByName('advice').appendRow([aGuest, adviceText, nowIso]);
      invalidateStateCache();
      return jsonResponse({ ok: true });
    }

    // Parents Actions (Require secret slug)
    if (
      action === 'setRevealTime' ||
      action === 'revealNow' ||
      action === 'setGender'
    ) {
      if (!verifyParentsSlug(body.slug)) {
        return jsonResponse({ error: 'Not found' });
      }

      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        var settingsSheet = ss.getSheetByName('settings');
        var current = readSettingsRow(ss);

        if (action === 'setRevealTime' || action === 'revealNow') {
          var nextTime = cleanText(body.revealTime, 40) || nowIso;
          settingsSheet.getRange(2, 1).setValue(nextTime);
          invalidateStateCache();
          return jsonResponse({ ok: true, revealTime: nextTime });
        }

        if (action === 'setGender') {
          if (current.locked) {
            return jsonResponse({
              error: 'Gender is already locked and cannot be modified.',
            });
          }
          var chosenGender =
            body.gender === 'boy'
              ? 'boy'
              : body.gender === 'girl'
              ? 'girl'
              : null;
          if (!chosenGender) {
            return jsonResponse({ error: 'Invalid gender choice' });
          }
          settingsSheet.getRange(2, 2).setValue(chosenGender);
          settingsSheet.getRange(2, 3).setValue(true);
          invalidateStateCache();
          return jsonResponse({ ok: true, locked: true });
        }
      } finally {
        lock.releaseLock();
      }
    }

    return jsonResponse({ error: 'Unknown POST action' });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}
