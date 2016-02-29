'use strict';

var winston = require('winston');
var winstonLogger = winston.Log;
var nodeUtil = require('util');
var util = require('lodash');
var vsprintf = require('sprintf-js').vsprintf;

/**
 * @param   {Object}  options
 * @param   {Boolean}  [options.IS_PRODUCTION_ENV=false]
 * @param   {String}  [options.MESSAGE_CONNECTOR=' && ']
 */
function Logger(options) {
    var logger = this;
    winstonLogger.apply(this, arguments);
    logger.opts = options;
}
util.inherits(Logger, winstonLogger);

var winstonLog = winstonLogger.prototype.log;


/**
 * 将目标对象(desc)的 key(property)对应的值，替换成默认值或者指定的值(alternative)
 *
 * 不同类型的 desc[property] 替换的默认值为：
 *   - String => '[secret String]'
 *   - Number => '[secret Number]'
 *   - Date => '[secret Date]'
 *   - Object|Array|Buffer => '[secret Object]'
 *
 * @side_effect desc
 * @param  {Object} desc
 * @param  {String} property
 * @param  {Any}    alternative
 * @method mask
 */
function mask(desc, property, alternative) {
    /* eslint-disable no-param-reassign */
    var val = util.get(desc, property);
    if (util.isUndefined(val)) return undefined;

    if (arguments.length === 2) {
        if (util.isString(val)) {
            alternative = '[secret String]';
        } else if (util.isNumber(val)) {
            alternative = '[secret Number]';
        } else if (util.isObject(val)) {
            alternative = '[secret Object]';
        } else if (util.isDate(val)) {
            alternative = '[secret Date]';
        }
    }

    util.set(desc, property, alternative);
}

/**
 * 根据 masks 制定的字段，直接修改传入的 meta 对应属性
 *
 * 如果对应属性为空，则 meta 不添加对应属性
 *
 * @side_effect meta
 * @param  {Object}               meta   元数据
 * @param  {Object|Array|String}  masks  如果为 Object，key 为指定属性，value 为替换值
 * @method maskMeta
 */
function maskMeta(meta, masks) {
    if (util.isArray(masks)) {
        util.each(masks, function(property) {
            mask(meta, property);
        });
    } else if (util.isObject(masks)) {
        util.each(masks, function(alternative, property) {
            mask(meta, property, alternative);
        });
    } else if (util.isString(masks)) {
        mask(meta, masks);
    }
}

/**
 * 如果 meta 的深度大于一层，不要去修改深层的属性！
 */
function rewriteMeta(meta, rewriter) {
    return rewriter(meta);
}

/**
 * 修改(增强)元数据
 *
 * @param  {Object} meta          元数据
 * @return {Object}               新的元数据
 * @method modifyMeta
 */
function modifyMeta(meta) {
    var $mask = meta.$mask;
    var $rewriter = meta.$rewriter;
    var omits = [];

    if ($mask) {
        maskMeta(meta, $mask);
        omits.push('$mask');
    }

    if ($rewriter) {
        meta = rewriteMeta(meta, $rewriter);
        omits.push('$rewriter');
    }

    return util.omit(meta, omits);
}

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
 * @example
 * logger.info('this is message');
 *
 * @example
 * var meta = {
 *     a: 1,
 *     b: 2
 * };
 * logger.info(meta);
 *
 * @example
 * logger.info(meta, 'message');
 * @example
 * logger.info(meta, 'id= %s', 1);
 * @example
 * logger.info(meta, 'object= %j', {a: 1});
 *
 * @example
 * var err = new Error();
 * logger.error(err);
 * @example
 * err.meta = {a: 1, b: 2}   // 添加其他的元数据
 * logger.error(err);  // err.meta 会作为 meta 打印出来
 * @example
 * logger.error(err, 'extra message');  // err.message 会和 'extra message' 拼接输出。
 * @example
 * logger.info(meta, 'id= %s', 1);
 *
 * @example
 * logger.error(meta, error);  // 如果同时存在 meta 和 error.meta 的同名属性，meta 的优先级更高
 *
 * @param  {String} message     具体写法见 https://github.com/alexei/sprintf.js#sprintfjs
 * @param  {Any}    params1..N  message 的填充参数
 * @param  {Object} meta        只支持深度为一层的 object
 * @param  {Error}  error       Error 对象
 * @method log([meta][, error], message[, params1, ... paramsN])
 * @method log([meta][, error])
 * @method log(message[, params1, ... paramsN])
 * @method log([error][, meta][, message[, params1, ... paramsN]])
 */
function log(level) {
    if (arguments.length === 0) return undefined;
    var logger = this;
    var opts = logger.opts;
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
        meta = util.defaults({
            errorName: error.name,
            errorCode: error.code,
            errorStack: error.stack,
            errorDetail: error.detail,
        }, meta, error.meta);

        if (message) {
            message = message + opts.MESSAGE_CONNECTOR + error.message;
        } else {
            message = error.message;
        }
    }

    if (message === undefined && meta === undefined && args.length > 0) {
        message = args.toString();
    }

    message = message || '(empty message)';

    var logParams = [level, message];

    if (meta) {
        if (opts.IS_PRODUCTION_ENV) {
            // 在生产环境下，过滤/改写敏感信息
            meta = modifyMeta(meta);
        }
        logParams.push(meta);
    }

    if (callback) logParams.push(callback);

    winstonLog.apply(logger, logParams);
}

Logger.prototype.log = function() {
    var logger = this;
    var args = Array.prototype.slice.call(arguments, 1);
    log.apply(logger, args);
};

Logger.prototype._log = winstonLog;

module.exports = Logger;
