# nps-log

![Node Version][Node Version Image]
[![Npm Package Version][Npm Package Version Image]][Npm Package Version LINK]
[![License][License Image]][License LINK]
![NodeJS Package Dependencies][NodeJS Package Dependencies Link]
[![Build Status][Build Status Image]][Build Status Link]
[![Code Climate][Code Climate Image]][Code Climate Link]
[![Test Coverage][Test Coverage Image]][Test Coverage Link]

一个基于 [winston][]，提供很多增强特性的日志模块。


## TOC

<!-- MarkdownTOC -->

- [安装 (Installation)](#安装-installation)
- [快速入门 (Quick Start)](#快速入门-quick-start)
- [log 传参](#log-传参)
- [元数据](#元数据)
- [遮挡敏感元数据](#遮挡敏感元数据)
- [Logger](#logger)
- [默认配置](#默认配置)
- [API](#api)
- [其他](#其他)
- [版本 (Versioning)](#版本-versioning)
- [版权声明 (Copyright and License)](#版权声明-copyright-and-license)

<!-- /MarkdownTOC -->


<a name="安装-installation"></a>
## 安装 (Installation)

**要求 winston 是 2.0.0 以上版本。**

```bash
npm install --save nps-log
```

<a name="快速入门-quick-start"></a>
## 快速入门 (Quick Start)

最简单的配置：

```js
var NPSLog = require('nps-log');
var winston = require('winston');

// 首先你需要初始化 NPSLog
NPSLog.init({
    isProductionEnv: process.env.NODE_ENV === 'production',
});

// 然后就能创建 logger 实例了
var logger = NPSLog.create({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({filename: 'somefile.log'}),
    ],
});
```

然后你就可以使用 logger 来记录日志了：

```js
logger.debug('this is a message with debug level.');  // 默认 level: 'info'，所以 debug 日志不会输出
logger.verbose('this is a message with verbose level.');  // 默认 level: 'info'，所以 verbose 日志不会输出
logger.info('this is a message with info level.');
logger.warn('this is a message with warn level.');
logger.error('this is a message with error level.');
```

除了 log 传参方式与 winton 语法不一致，其他 API 及配置方式都与 winton 一样，可以正常使用。

<a name="log-传参"></a>
## log 传参

以 `log` 函数为例，winston 的 log 函数签名是 `function log(level, msg[, meta][, callback])`

而本项目提供了一种新的更灵活的传参方式，函数签名如：

- `log([error][, meta][, message[, params1, ... paramsN]])`
- `log([meta][, error][, message[, params1, ... paramsN]])`

首先，message 支持 sprintf 格式的字符串，具体语法规则请见 [alexei/sprintf.js][]。

其次，除了 message，还支持同时传入元数据 (meta) 和错误 (error)。注意，**只有 Error 类的实例才算是错误**。而 meta 就是一个普通的 object。  
meta 和 error 的输入顺序可以对调，也可以省略，但必须出现在 message 之前。

<a name="元数据"></a>
## 元数据

元数据作为一种键值对存储，建议使用它来存储上下文信息，而不用将数据写到 message 中。这样更易索引，且更易读。

<a name="遮挡敏感元数据"></a>
## 遮挡敏感元数据

你可以在 meta 中设置特殊字段 `$mask`，用来在生产环境遮挡敏感数据。

首先需要 `init({isProductionEnv: true})` 传入的 `isProductionEnv` 要为 `true`，表示当前是生产环境。  
然后你就可以这样使用：

```js
var meta = {
    a: 1,
    b: [2],
    c: '3',
    d: {},
    e: {f: '4'},
    $mask: ['a', 'b', 'c', 'e'],
};

logger.info(meta, 'this meta will be masked');
```

默认会使用 `[secret XXX]` 的形式来作为替换值。`$mask` 还可以是 object 的形式，key 为要遮挡的 meta 字段，value 为替换值。例如：

```js
var meta = {
    a: 1,
    b: [2],
    c: '3',
    d: {},
    e: {f: '4'},
    $mask: {
        a: 'You',
        b: 'Cannot',
        c: 'See',
        e: 'Me',
    },
};

logger.info(meta, 'this meta will be masked');
```

<a name="logger"></a>
## Logger

除了使用 `create` 函数创建 Logger 实例，你还可以通过 `require('nps-log').Logger` 来获取 Logger 模块。

该模块继承了 `winston.Logger`，主要更改了 log 传参。你可以直接使用它来附加自己的功能。

<a name="默认配置"></a>
## 默认配置

<a name="api"></a>
## API

see http://adoyle.me/nps-log/

<a name="其他"></a>
## 其他

建议使用 [winston-pretty-console][] 来代替 winston 内置 Console Transport。它会输出人类阅读友好的信息。

<a name="版本-versioning"></a>
## 版本 (Versioning)

版本迭代遵循 SemVer 2.0.0 的规则。

*但是*，当主版本号是零（0.y.z），一切*随时*都可能有*不兼容的修改*。这处于开发初始阶段，其公共 API 是不稳定的。

关于 SemVer 的更多信息，请访问 http://semver.org/。

<a name="版权声明-copyright-and-license"></a>
## 版权声明 (Copyright and License)

Copyright (c) 2016 ADoyle. The project is licensed under the **Apache License Version 2.0**.

See the [LICENSE][] file for the specific language governing permissions and limitations under the License.

See the [NOTICE][] file distributed with this work for additional information regarding copyright ownership.


<!-- Links -->

[LICENSE]: ../LICENSE
[NOTICE]: ../NOTICE

[winston]: https://github.com/winstonjs/winston
[winston-pretty-console]: https://github.com/adoyle-h/winston-pretty-console
[alexei/sprintf.js]: https://github.com/alexei/sprintf.js

<!-- Badges links -->

[Node Version Image]: https://img.shields.io/node/v/nps-log.svg
[Npm Package Version Image]: https://img.shields.io/npm/v/nps-log.svg
[Npm Package Version LINK]: https://www.npmjs.com/package/nps-log
[License Image]: https://img.shields.io/npm/l/nps-log.svg
[License LINK]: https://github.com/adoyle-h/nps-log/blob/master/LICENSE
[NodeJS Package Dependencies Link]: https://david-dm.org/adoyle-h/nps-log.svg
[Build Status Image]: https://travis-ci.org/adoyle-h/nps-log.svg?branch=master
[Build Status Link]: https://travis-ci.org/adoyle-h/nps-log
[Code Climate Image]: https://codeclimate.com/github/adoyle-h/nps-log/badges/gpa.svg
[Code Climate Link]: https://codeclimate.com/github/adoyle-h/nps-log
[Test Coverage Image]: https://codeclimate.com/github/adoyle-h/nps-log/badges/coverage.svg
[Test Coverage Link]: https://codeclimate.com/github/adoyle-h/nps-log/coverage
