/**
 * Module dependencies.
 */

var express = require('express'),
    marked = require('marked'),
    moment = require('moment'),
    hljs = require('highlight.js'),
    hbs = require('hbs'),
    path = require('path'),
    http = require('http'),
    es6shim = require('es6-shim'),
    fs = require('graceful-fs'),
    config = require('./config.json'),
    globalData = require('./global.json'),
    redirects = require('./redirects.json'),
    routes = require('./routes');

// Functions

function each(object, callback) {
    Object.keys(object).forEach(function(key) {
        var value = object[key];

        callback(key, value);
    });
}

function isEmptyObject(obj) {
    var count = 0;

    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            count++;
        }
    }

    return (count === 0);

}

Object.extend = function(destination, source) {
    for (var property in source) {
        if (source[property] && source[property].constructor && source[property].constructor === Object) {
            destination[property] = destination[property] || {};
            arguments.callee(destination[property], source[property]);
        } else {
            destination[property] = source[property];
        }
    }
    return destination;
};

function clone(obj) {
    return Object.extend({}, obj);
}

var app = express();

// Configuration
var siteRoot = path.join(__dirname, config.directories.common);
var viewDir = path.join(siteRoot, config.directories.layout, config.layout);
var viewDirContent = fs.readdirSync(viewDir);

each(viewDirContent, function(key, value) {
    if ((value === 'partials') || (value === 'helpers')) {
        var subDir = fs.readdirSync(path.join(viewDir, value));

        each(subDir, function(subKey, subValue) {
            var subContent = fs.readFileSync(path.join(viewDir, value, subValue), 'utf-8');

            if (value === 'partials') hbs.registerPartial(subValue.substr(0, subValue.lastIndexOf('.')), subContent);
            if (value === 'helpers') hbs.registerHelper(subValue.substr(0, subValue.lastIndexOf('.')), subContent);
        });
    }
});


app.configure(function() {
    app.set('port', process.env.PORT || config.port);
    app.set('views', viewDir);

    // Handlebars is the standard view engine and is mapped to html
    if (config.viewEngine === 'hbs') {
        app.set('view engine', 'html');
        app.engine('html', hbs.__express);
    } else {
        app.engine('view engine', config.viewEngine);
    }

    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser(config.sessionSecret.toString('base64')));
    app.use(express.session());
    app.use(app.router);
    app.use(require('less-middleware')({
        src: siteRoot,
        force: true,
        compress: true
    }));
    app.use(express.static(siteRoot));
});

app.configure('development', function() {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});


app.use(function(req, res, next){
  // respond with html page
  if (req.accepts('html')) {
    res.status(404);
    res.render('404', Object.extend(clone(globalData), { content: req.url }));
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

app.use(function(err, req, res, next){
  // we may use properties of the error object
  // here and next(err) appropriately, or if
  // we possibly recovered from the error, simply next().
  res.status(err.status || 500);
  res.render('500', Object.extend(clone(globalData), { content: err }));
});

var articleDir = path.join(siteRoot, config.directories.articles);
var contentObject = {};
var internalDateTimeFormat = 'YYYYMMDDHHmmss';

// Marked configuration
// Set default options
marked.setOptions({
    gfm: true,
    pedantic: false,
    sanitize: true,
    // callback for code highlighter
    highlight: function(code, lang) {
        //return hljs.highlight(lang, code).value;
        //return hljs.highlightAuto(code).value;
        return code;
        console.log('highlighter is called');
    }
});

function isValidFile(filename) {
    if ((!filename.startsWith('.')) && (!filename.startsWith('_'))) {
        return (filename.endsWith('md') || filename.endsWith('mdown') || filename.endsWith('markdown') || filename.endsWith('html'));
    }

    return false;
}

function generateContent(filepath, filename) {

    var isMarkdown = (!filename.endsWith('html'));
    var fileDate = moment(filename.substr(0, 8), internalDateTimeFormat);

    fileData = fs.readFileSync(path.join(articleDir, filepath, filename), 'utf-8');

    var metaSeparator = config.metadataSeparator;

    var articleData = '';

    var defaultMetaData = {};

    defaultMetaData = JSON.parse(fs.readFileSync('metadata.json', 'utf-8'));

    if (fileDate && (filename.charAt(8) === '-')) {
        var stringLength = filename.lastIndexOf('.') - 9;

        defaultMetaData['route'] = '/' + path.join(filepath, fileDate.format(config.dateRouteFormat), filename.substr(9, stringLength));
    } else {
        var basename = filename.substr(0, filename.lastIndexOf('.'));
        if (basename !== 'index') {
            defaultMetaData['route'] = '/' + basename;
        } else {
            if (filepath) {
                defaultMetaData['route'] = '/' + filepath;
            } else {
                defaultMetaData['route'] = '/';
            }
        }

    }

    var metaDataJSON = {};

    if (fileData.startsWith(metaSeparator)) {
        var startSymbol = fileData.indexOf(metaSeparator, 0);
        var endSymbol = fileData.indexOf(metaSeparator, metaSeparator.length);

        var metaData = fileData.substr(startSymbol + metaSeparator.length, endSymbol - metaSeparator.length);

        try {
            metaDataJSON = JSON.parse(metaData);
        } catch (e) {
            console.log('Error while parsing metadata (' + e + ') in file ' + filename);
        }

        articleData = fileData.substr(endSymbol + metaSeparator.length, fileData.length);

    } else {
        articleData = fileData;
    }


    var templateData = Object.extend(clone(globalData), Object.extend(defaultMetaData, metaDataJSON));
    //console.log(templateData);
    //console.log(globalData);
    //console.log(Object.extend(globalData, generatedMetadata));

    //var templateData = generatedMetadata;
    
    if (templateData.language && templateData.language.isArray && templateData.language.length > 1) {

    } else {
        templateData['content'] = (isMarkdown) ? marked(articleData) : articleData;
    }

    if (config.dateFromNow) {
        if (templateData['created']) templateData['created'] = moment(templateData['created'], internalDateTimeFormat).fromNow();

        if (templateData['modified']) templateData['modified'] = moment(templateData['modified'], internalDateTimeFormat).fromNow();
    } else {
        if (templateData['created']) templateData['created'] = moment(templateData['created'], internalDateTimeFormat).format(config.dateFormat);

        if (templateData['modified']) templateData['modified'] = moment(templateData['modified'], internalDateTimeFormat).format(config.dateFormat);
    }

    contentObject[templateData.route] = templateData;

    //console.log(templateData);
    /*console.log(templateData.route);

    app.get(templateData.route, function(req, res) {
        console.log(req.url);
    });*/

    /*app.get(templateData.route, function(req, res) {
        console.log(templateData.route);
        console.log(templateData.content);

        res.end();
        app.render(templateData.template, templateData, function(err, html) {
            if (err) {
                console.log(err);

                res.send(500, {
                    error: 'Error while rendering article: ' + err
                });
            }

            console.log(html);
            res.send(html);
        });
    });*/

}

// Routes
app.get('/dashboard', routes.dashboard);
//app.get('/:category/:year?/:month?/:day?/:title/:action?', routes.post);
//app.get('/:page?/:action?', routes.page);
var directories = fs.readdirSync(articleDir);


each(directories, function(key, value) {

    var statObject = fs.statSync(path.join(articleDir, value));
    if (statObject.isFile()) {

        if (isValidFile(value)) {
            generateContent(undefined, value);
        }

    } else {

        var subDirectory = fs.readdirSync(path.join(articleDir, value));

        each(subDirectory, function(subKey, subValue) {

            var statSubObject = fs.statSync(path.join(articleDir, value, subValue));

            if (statSubObject.isFile()) {
                if (isValidFile(subValue)) {
                    generateContent(value, subValue);
                }
            }
        });

    }

});

//console.log(contentObject);

each(contentObject, function(key, value) {
    app.get(key, function(req, res, next) {
        app.render(value['template'], value, function(err, html) {
            if (err) {
                res.send(500, {
                    error: 'Error while rendering article: ' + err
                });
            }

            res.send(html);
        });
    });
});

//console.log(app.routes);

if (!isEmptyObject(redirects)) {
    each(redirects, function(key, value) {
        if ((typeof key === "string") && (typeof value === "string")) {
            app.get(key, function(req, res) {
                res.redirect(value);
            });
        }
    });
}

app.get('/404', function(req, res, next){
  next();
});

app.get('/403', function(req, res, next){
  var err = new Error('not allowed!');
  err.status = 403;
  next(err);
});

app.get('/500', function(req, res, next){
  next(new Error('keyboard cat!'));
});


http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port') + " in " + app.get('env') + " mode");
});