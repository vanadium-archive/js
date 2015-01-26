module.exports = Catalog;
var formatError = require('./format');

function Catalog() {
  this.formats = {};
}

function baseLang(lang) {
  return lang.split('-')[0];
}

/**
 * lookups the language/msgId pair in the catalog.
 *
 * @private
 * @param {string} lang the language code
 * @param {string} msgId the id of the error
 * @returns {string|null} the format string for the lang/msgId pair or null.
 */
Catalog.prototype._lookup = function(lang, msgId) {
  var langMap = this.formats[lang];
  if (!langMap) {
    return null;
  }
  return langMap[msgId];
};

/**
 * lookups the language/msgId pair in the catalog. If there is no match
 * on the full language the string the base language (i.e 'en' for 'en-US') is
 * looked up instead.
 *
 * @private
 * @param {string} lang the language code
 * @param {string} msgId the id of the error
 * @returns {string} the format string for the lang/msgId pair.
 */
Catalog.prototype.lookup = function(lang, msgId) {
  var defaultFormat = msgId + '{:_}';
  return this._lookup(lang, msgId) ||
    this._lookup(baseLang(lang), msgId) ||
    defaultFormat;
};

Catalog.prototype.format = function(lang, msgId, args) {
  return formatError(this.lookup(lang, msgId), args);
};

/**
 * sets the format for the lang/msgId pair
 * @private
 * @param {string} lang the language code
 * @param {string} msgId the id of the error
 * @param {string} format the format of the message
 */
Catalog.prototype.set = function(lang, msgId, format) {
  var langs = this.formats[lang];
  if (!langs) {
    this.formats[lang] = {};
    langs = this.formats[lang];
  }
  langs[msgId] = format;
};

/**
 * sets the format for the lang/msgId pair. Also sets the format for
 * the base of the language if no format exists for it.
 * @private
 * @param {string} lang the language code
 * @param {string} msgId the id of the error
 * @param {string} format the format of the message
 */
Catalog.prototype.setWithBase = function (lang, msgId, format) {
  this.set(lang, msgId, format);
  var base = baseLang(lang);
  if (!this._lookup(base, msgId, format)) {
    this.set(base, msgId, format);
  }
};

var escapedStringRe = /"([^"\\]|\\.)*"/;

/**
 * Merges the catalog data passed in.
 * Each valid line will have three parts. It will be:
 *   <langId> <msgId> "<format>"
 * format will be enclosed in quotes and escaped properly.
 * If the line begins with '#' or is malformed, it is ignored.
 * @private
 * @param {string} data the language code
 */
Catalog.prototype.merge = function(data) {
  var catalog = this;
  data.split('\n').forEach(function(line) {
   var parts = line.split(/\s+/);
    if (parts.length < 3) {
      return;
    }
    var langId = parts[0];
    if (langId[0] === '#') {
      return;
    }
    var msgId = parts[1];
    // The message is quoted, so we need to unquote it.
    var message = parts.splice(2).join(' ');
    var match = escapedStringRe.exec(message);
    if (!match) {
      return;
    }
    try {
      message = JSON.parse(match[0]);
    } catch (e) {
      return;
    }
    catalog.setWithBase(langId, msgId, message);
  });
};
