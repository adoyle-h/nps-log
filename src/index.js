'use strict';

var Logger = require('./logger');
var util = require('lodash');

var initialized = false;
var isProductionEnv;

exports.Logger = Logger;

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
    var val = util.get(desc, property);
    if (util.isUndefined(val)) return undefined;

    var str;
    if (arguments.length === 2) {
        str = Object.prototype.toString.call(val);
        alternative = str.replace(/^\[object/, '[secret');
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
 * @method modifyMeta
 * @param  {Object} meta          元数据
 * @return {Object}               新的元数据
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
 * @method  defaultRewriter
 * @param   {String}  level
 * @param   {String}  msg
 * @param   {Object}  meta
 * @return  {Object}  new meta
 */
exports.defaultRewriter = function(level, msg, meta) {
    if (isProductionEnv) {
        // 在生产环境下，过滤/改写敏感信息
        meta = modifyMeta(meta);
    }
    return meta;
};

exports.defaultModifyMetaWhenLogError = function(error, meta) {
    return util.defaults({
        errorName: error.name,
        errorCode: error.code,
        errorStack: error.stack,
        errorDetail: error.detail,
    }, meta, error.meta);
};


/**
 * @method init
 * @param   {Object}  [options]
 * @param   {Boolean}  [options.isProductionEnv=false]  是否为生产环境
 * @return  {undefined}
 */
exports.init = function(options) {
    if (initialized) return undefined;

    options = options || {};
    isProductionEnv = options.isProductionEnv || false;

    initialized = true;
};

/**
 * 创建默认配置的 logger
 *
 * @method  create
 * @param  {Object}  [params]  通常用模块全局变量 `module`
 * @param  {String}  [params.MESSAGE_CONNECTOR=' && ']
 * @param  {Object[]}  [params.transports=null]
 * @param  {Boolean}  [params.padLevels=false]
 * @param  {Object}  [params.levels]  see https://github.com/winstonjs/winston#logging-levels
 *                                     default to {error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5}
 * @param  {Object}  [params.colors]
 * @param  {String}  [params.level='info']
 * @param  {Boolean}  [params.emitErrs=false]
 * @param  {Boolean}  [params.stripColors=false]
 * @param  {Function|false}  [params.exitOnError]
 * @param  {Function[]}  [params.rewriters=[]]
 * @param  {Function[]}  [params.filters=[]]
 * @param  {Function}  [params.exceptionHandlers=undefined]
 * @param  {Function}  [params.modifyMetaWhenLogError]
 * @param  {String} [params.filename] 当前 logger 所在文件路径
 * @param  {Object<String, String>} [params.metaAliases] meta 字段重命名
 * @return  {Logger}  logger
 */
exports.create = function create(params) {
    params = util.defaults({}, params, {
        rewriters: [],
        modifyMetaWhenLogError: exports.defaultModifyMetaWhenLogError,
    });
    params = util.clone(params);
    if (initialized === false) throw new Error('You should initialize the log module first.');
    if (!params || !util.isString(params.filename)) {
        throw new Error('Missing parameter `filename` for creating new logger.');
    }
    params.rewriters.push(exports.defaultRewriter);
    return new Logger(params);
};
