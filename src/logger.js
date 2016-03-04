'use strict';

var winston = require('winston');
var winstonLogger = winston.Logger;
var nodeUtil = require('util');
var util = require('lodash');
var vsprintf = require('sprintf-js').vsprintf;

/**
 * @param  {Object}  options
 * @param  {String}  [options.MESSAGE_CONNECTOR=' && ']
 * @param  {Object[]}  [options.transports=null]
 * @param  {Boolean}  [options.padLevels=false]
 * @param  {Object}  [options.levels]  see https://github.com/winstonjs/winston#logging-levels
 *                                     default to {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5}
 * @param  {Object}  [options.colors]
 * @param  {String}  [options.level='info']
 * @param  {Boolean}  [options.emitErrs=false]
 * @param  {Boolean}  [options.stripColors=false]
 * @param  {Function|false}  [params.exitOnError]
 * @param  {Function[]}  [options.rewriters=[]]
 * @param  {Function[]}  [options.filters=[]]
 * @param  {Function}  [options.exceptionHandlers=undefined]
 * @param  {Function}  [options.modifyMetaWhenLogError]
 * @param  {String} [options.filename] 当前 logger 所在文件路径
 * @param  {Object<String, String>} [options.metaAliases] meta 字段重命名
 */
function Logger(options) {
    var logger = this;
    winstonLogger.apply(this, arguments);
    logger.opts = options;
    if (util.isFunction(options.modifyMetaWhenLogError)) {
        logger._modifyMetaWhenLogError = options.modifyMetaWhenLogError;
    }

    if (util.isString(options.MESSAGE_CONNECTOR)) {
        logger.MESSAGE_CONNECTOR = options.MESSAGE_CONNECTOR;
    }

    var metaAliases = options.metaAliases || {};
    var _metaAliases = logger._metaAliases = {};

    util.each(['filename'], function(metaProp) {
        var alias = metaAliases[metaProp];
        if (util.isString(alias) && (util.isEmpty(alias) === false)) {
            _metaAliases[metaProp] = alias;
        } else {
            _metaAliases[metaProp] = metaProp;
        }
    });
}
nodeUtil.inherits(Logger, winstonLogger);

var winstonLog = winstonLogger.prototype.log;

/**
 * @method   _modifyMetaWhenLogError
 * @param    {Error}  error
 * @param    {Object}  meta  不要直接修改 meta！
 * @return   {Object}  新的 meta
 * @private
 */
// eslint-disable-next-line handle-callback-err
Logger.prototype._modifyMetaWhenLogError = function(error, meta) {
    return meta;
};

Logger.prototype.MESSAGE_CONNECTOR = ' && ';

/**
 * log 参数不限顺序，只要保证 message 在 meta 和 error 后面就行。
 *
 * log 如何区分 meta 和 error： error 必须是 Error 的实例；meta 必须是一个 Object。
 *
 * 若 error 存在下列字段，会自动被赋值到 meta 中去；且这些字段不会被传入的 meta 所覆盖。
 *     - meta.errorName: error.name,
 *     - meta.errorCode: error.code,
 *     - meta.errorStack: error.stack,
 *     - meta.errorDetail: error.detail,
 *
 * Method Styles:
 *    - log([error][, meta][, message[, params1, ... paramsN]])
 *    - log([meta][, error][, message[, params1, ... paramsN]])
 *
 *   @example
 *   logger.info('this is message');
 *
 *   @example
 *   var meta = {
 *       a: 1,
 *       b: 2
 *   };
 *   logger.info(meta);
 *
 *   @example
 *   logger.info(meta, 'message');
 *   @example
 *   logger.info(meta, 'id= %s', 1);
 *   @example
 *   logger.info(meta, 'object= %j', {a: 1});
 *
 *   @example
 *   var err = new Error();
 *   logger.error(err);
 *   @example
 *   err.meta = {a: 1, b: 2}   // 添加其他的元数据
 *   logger.error(err);  // err.meta 会作为 meta 打印出来
 *   @example
 *   logger.error(err, 'extra message');  // err.message 会和 'extra message' 拼接输出。
 *   @example
 *   logger.info(meta, 'id= %s', 1);
 *
 *   @example
 *   logger.error(meta, error);  // 如果同时存在 meta 和 error.meta 的同名属性，meta 的优先级更高
 *
 * @method log
 * @param  {String} message     具体写法见 https://github.com/alexei/sprintf.js#sprintfjs
 * @param  {Any}    params1..N  message 的填充参数
 * @param  {Object} meta        只支持深度为一层的 object
 * @param  {Error}  error       Error 对象
 */
function log(level) {
    if (arguments.length === 0) return undefined;
    var logger = this;
    var opts = logger.opts;
    var _metaAliases = logger._metaAliases;
    var args = Array.prototype.slice.call(arguments, 1);
    var message, params, meta, error, preArgs, arg;

    var callback = util.last(args);
    if (util.isFunction(callback)) {
        args = args.slice(0, -1);
    } else {
        callback = null;
    }

    var messageIndex = util.findIndex(args.slice(0, 3), util.isString);

    if (messageIndex !== -1) {
        params = args.slice(messageIndex + 1);
        if (params.length > 0) {
            message = vsprintf(args[messageIndex], params);
        } else {
            message = args[messageIndex];
        }
        preArgs = args.slice(0, messageIndex);
    } else {
        preArgs = args.slice(0, 2);
    }

    while (preArgs.length !== 0) {
        arg = preArgs.pop();
        if (nodeUtil.isError(arg)) {
            error = arg;
        } else if (util.isObject(arg)) {
            meta = arg;
        }
    }

    if (error) {
        meta = logger._modifyMetaWhenLogError(error, meta) || meta;

        if (message) {
            message = message + logger.MESSAGE_CONNECTOR + error.message;
        } else {
            message = error.message;
        }
    }

    if (message === undefined && meta === undefined && args.length > 0) {
        message = args.toString();
    }

    message = message || '(empty message)';

    var logParams = [level, message];

    if (opts.filename) {
        meta = meta || {};
        meta[_metaAliases.filename] = opts.filename;
    }

    if (meta) {
        logParams.push(meta);
    }

    if (callback) logParams.push(callback);

    winstonLog.apply(logger, logParams);
}

Logger.prototype._log = winstonLog;

Logger.prototype.log = function() {
    var logger = this;
    var args = Array.prototype.slice.call(arguments);
    return log.apply(logger, args);
};

function queryCallback(err, results) {
    /* eslint no-console: 0 */
    if (err) return console.error(err);
    console.log(results);
}

var _query = Logger.prototype.query;
Logger.prototype.query = function(options, callback) {
    return _query.call(this, options, callback || queryCallback);
};

var _profile = Logger.prototype.profile;
Logger.prototype.profile = function(message) {
    var logger = this;
    if (message) message = '[Profiling] ' + message;
    else message = '[Profiling]';
    _profile.call({
        profilers: logger.profilers,
        info: function(msg, meta, callback) {
            return logger.info(meta, msg, callback);
        },
    }, message);
    return logger;
};

module.exports = Logger;
