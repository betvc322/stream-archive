/**
 * A — фильмы, B — сериалы, C — постеры фильмов, D — постеры сериалов.
 * Расширения → Apps Script → вставьте весь файл вместо содержимого Code.gs.
 * Заполните настройки и опубликуйте как Web App. Подробности — в README.md.
 */
var CONFIG = Object.freeze({
  SPREADSHEET_ID: 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ',
  SHEET_NAME: 'Лист1',
  MOVIE_POSTER_COLUMN: 3,
  SERIES_POSTER_COLUMN: 4
});

function doGet() {
  try {
    return jsonOutput_({ items: readCatalog_() });
  } catch (error) {
    console.error('Не удалось прочитать каталог: ' + error.message);
    // ContentService не позволяет задать HTTP-статус. Next.js распознает этот
    // объект как ошибку и вернет посетителю HTTP 502 с кнопкой повтора.
    return jsonOutput_({ error: 'CATALOG_UNAVAILABLE' });
  }
}

/** Запустите эту функцию в редакторе, чтобы выдать разрешения и проверить JSON. */
function testCatalog() {
  var items = readCatalog_();
  console.log(JSON.stringify({ items: items }, null, 2));
  console.log('Записей: ' + items.length + '; со ссылкой: ' + items.filter(function (item) { return item.url !== null; }).length);
}

function readCatalog_() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Не найден лист: ' + CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Три пакетных чтения вместо обращения к каждой ячейке отдельно.
  var width = Math.min(sheet.getMaxColumns(), Math.max(2, CONFIG.MOVIE_POSTER_COLUMN, CONFIG.SERIES_POSTER_COLUMN));
  var range = sheet.getRange(2, 1, lastRow - 1, width);
  var texts = range.getDisplayValues();
  var richTexts = range.getRichTextValues();
  var formulas = range.getFormulas();
  var items = [];

  for (var row = 0; row < texts.length; row++) {
    for (var column = 0; column < 2; column++) {
      var text = String(texts[row][column] || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      var type = column === 0 ? 'movie' : 'series';
      var metadata = parseTitle_(text, type);
      var sourceRow = row + 2;
      var posterColumn = (column === 0 ? CONFIG.MOVIE_POSTER_COLUMN : CONFIG.SERIES_POSTER_COLUMN) - 1;
      items.push({
        id: (column === 0 ? 'film-' : 'series-') + sourceRow,
        type: type,
        title: metadata.title,
        year: metadata.year,
        season: metadata.season,
        url: extractLink_(richTexts[row][column], formulas[row][column], sheet),
        posterUrl: extractPoster_(texts[row][posterColumn], richTexts[row][posterColumn]),
        sourceRow: sourceRow
      });
    }
  }
  return items;
}

/** Убираем только метаданные в конце, сохраняя числа и скобки внутри названия. */
function parseTitle_(text, type) {
  var title = text;
  var year = null;
  var season = null;
  // Два прохода поддерживают оба порядка: (2026) 1 сезон и 1 сезон (2026).
  for (var pass = 0; pass < 2; pass++) {
    if (type === 'series' && season === null) {
      var seasonMatch = /\s+(\d{1,4})\s+сезон(?:а|ов)?\s*$/i.exec(title);
      if (seasonMatch && Number(seasonMatch[1]) > 0) {
        season = Number(seasonMatch[1]);
        title = title.slice(0, seasonMatch.index).trim();
      }
    }
    if (year === null) {
      var yearMatch = /\s*\(([12]\d{3})\)\s*$/.exec(title);
      if (yearMatch) {
        year = Number(yearMatch[1]);
        title = title.slice(0, yearMatch.index).trim();
      }
    }
  }
  // Если ячейка содержала только метаданные, все равно сохраняем видимый текст.
  return { title: title || text, year: year, season: season };
}

/** Google RichText может вернуть null для getLinkUrl(), если ссылки стоят на частях текста. */
function extractLink_(richText, formula, sheet) {
  if (richText) {
    var wholeLink = safeBoostyUrl_(richText.getLinkUrl());
    if (wholeLink) return wholeLink;
    var runs = richText.getRuns();
    for (var index = 0; index < runs.length; index++) {
      var runLink = safeBoostyUrl_(runs[index].getLinkUrl());
      if (runLink) return runLink;
    }
  }
  // Запасной путь для HYPERLINK(), если RichText не предоставил URL.
  // Поддерживаются строковый URL и прямая ссылка на ячейку с URL.
  var argument = hyperlinkArgument_(formula);
  if (!argument) return null;
  if (argument.charAt(0) === '"' && argument.charAt(argument.length - 1) === '"') {
    return safeBoostyUrl_(argument.slice(1, -1).replace(/""/g, '"'));
  }
  if (/^\$?[A-Z]{1,3}\$?[1-9]\d*$/i.test(argument)) {
    return safeBoostyUrl_(sheet.getRange(argument.replace(/\$/g, '')).getDisplayValue());
  }
  // Не исполняем произвольные формулы. Для сложной формулы используйте Ctrl+K.
  return null;
}

/** Считываем первый аргумент с учетом кавычек, скобок и обоих разделителей. */
function hyperlinkArgument_(formula) {
  var match = /^\s*=\s*(?:HYPERLINK|ГИПЕРССЫЛКА)\s*\(/i.exec(String(formula || ''));
  if (!match) return null;
  var rest = formula.slice(match[0].length);
  var quoted = false;
  var depth = 0;
  for (var index = 0; index < rest.length; index++) {
    var character = rest.charAt(index);
    if (character === '"') {
      if (quoted && rest.charAt(index + 1) === '"') { index++; continue; }
      quoted = !quoted;
    } else if (!quoted) {
      if (character === '(') depth++;
      else if (character === ')') {
        if (depth === 0) return rest.slice(0, index).trim();
        depth--;
      } else if ((character === ',' || character === ';') && depth === 0) {
        return rest.slice(0, index).trim();
      }
    }
  }
  return null;
}

function safeBoostyUrl_(value) {
  if (typeof value !== 'string') return null;
  var url = value.trim();
  // Только Boosty по HTTPS. Фрагменты/параметры сохраняются, javascript: исключен.
  return /^https:\/\/(?:www\.)?boosty\.to(?:[/?#][^\s\u0000-\u001f]*)?$/i.test(url) ? url : null;
}

function safePosterUrl_(value) {
  if (typeof value !== 'string') return null;
  var url = value.trim();
  return /^https:\/\/(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}(?::443)?(?:[/?#][^\s\u0000-\u001f]*)?$/i.test(url) ? url : null;
}

function extractPoster_(text, richText) {
  var url = safePosterUrl_(text);
  if (url || !richText) return url;
  url = safePosterUrl_(richText.getLinkUrl());
  if (url) return url;
  var runs = richText.getRuns();
  for (var index = 0; index < runs.length; index++) {
    url = safePosterUrl_(runs[index].getLinkUrl());
    if (url) return url;
  }
  return null;
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
