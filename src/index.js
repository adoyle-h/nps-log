'use strict';

var Path = require('path');
var bytes = require('bytes');
var Logger = require('./logger');

var Console = require('winston-pretty-console');

var LEVELS, COLORS, PROJECT_DIR;

function Log(argument) {

}

function trimPath(filePath) {
    return filePath.replace(PROJECT_DIR, './');
}

/**
 * @param  {Object} params
 * @param  {String} params.filename 文件名
 * @param  {Object} params.logger  winston logger
 * @method Logger
 */
function Logger(params) {
    var logger = this;
    logger.filename = params.filename;
    logger.logger = params.logger;
}

function queryCallback(err, results) {
    /* eslint no-console: 0 */
    if (err) return console.error(err);
    console.log(results);
}

Logger.prototype.stream = function(options) {
    return this.logger.stream(options);
};

Logger.prototype.query = function(options, callback) {
    callback = callback || queryCallback;
    this.logger.query(options, callback);
};

Logger.prototype.profile = function(message) {
    if (message) message = '[Profiling] ' + message;
    else message = '[Profiling]';
    this.logger.profile(message);
};


/**
 * 创建文件专用的 logger，logger 只支持以下方法：
 * - logger.debug
 * - logger.info
 * - logger.warn
 * - logger.error
 * - logger.fatal
 * - logger.query(opts[, callback])
 * - logger.profile([message=''])
 *
 * @param  {Object} module           通常用模块全局变量 `module`
 * @param  {Srting} module.filename  此 module 的文件路径，绝对路径。
 * @return {Object}                  logger
 * @method create(module)
 */
function create(module) {  // eslint-disable-line no-shadow
    if (!module || !util.isString(module.filename)) {
        throw new Error('Missing parameter `module` for creating new logger');
    }
    return new Logger({
        filename: trimPath(module.filename),
        logger: internals.logger,
    });
}

function getLevels() {
    if (!internals.logger) return undefined;
    return LEVELS;
}

function setLevel(level, transport) {
    var logger = internals.logger;
    if (!logger) return undefined;

    var transports = [];

    if (transport && logger.transports[transport]) {
        transports.push(logger.transports[transport]);
    } else {
        transports = util.keys(logger.transports);
    }

    util.each(transports, function(transportName) {
        logger.transports[transportName].level = level;
    });
}

function listTransports() {
    if (!internals.logger) return undefined;
    return util.keys(internals.logger.transports);
}

function removeTransport(name) {
    var logger = internals.logger;
    if (!logger) return undefined;
    return logger.remove(logger.transports[name]);
}

function addFileTransport(level, filePath, fileOpts) {
    internals.transports.push(
        new winston.transports.File({
            logstash: true,
            name: level + '-file',
            filename: filePath,
            level: level,
            colorize: false,
            maxsize: bytes(fileOpts.maxSize),
            maxFiles: fileOpts.maxFiles,
            tailable: fileOpts.tailable,
        })
    );
}

Log.prototype.create = create;
Log.prototype.removeTransport = removeTransport;
Log.prototype.listTransports = listTransports;
Log.prototype.getLevels = getLevels;
Log.prototype.setLevel = setLevel;

module.exports = exports = Log;
