var through = require('through2');
var Vinyl = require('vinyl');
var PluginError = require('plugin-error');
var fs = require("fs");
var path = require('path');

const PLUGIN_NAME = 'gulp-angular-insert';

const TEMPLATE_URL_PATTERN = /templateUrl\s*:(\s*['"`](.*?)['"`]\s*)/gm;
const STYLE_URL_PATTERN = /styleUrls *:(\s*\[[^\]]*?\])/g;
const STRING_PATTERN = /(['`"])((?:[^\\]\\\1|.)*?)\1/g;

function replaceContent(fileContent) {
    fileContent = fileContent
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/\s{2,}/gm, " ")
        .replace(/\'/gm, "\\\'")
        .replace(/\"/gm, "\\\"")
        .replace(/\$(\d+)/gm, "&#x0024;$1")
        .trim();
    return fileContent;
}

function replaceUrl(url) {
    url = url
        .replace(/\'/gm, "")
        .replace(/\"/gm, "")
        .trim();
    return url;
}

function getStyleSheetsContent(file, fileContent) {
    var filePath = path.dirname(file.path);
    var stylesContent = "";

    // Search for styleUrls match
    var styleUrlsMatch = fileContent.toString().match(STYLE_URL_PATTERN);
    if (styleUrlsMatch) {
        var styleUrls = styleUrlsMatch.toString().match(STRING_PATTERN);
        for (var i = 0; i < styleUrls.length; i++) {
            styleUrls[i] = replaceUrl(styleUrls[i]);

            //if absolute path
            var beginPath = './app/';
            if (styleUrls[i].startsWith(beginPath)) {
                styleUrls[i] = styleUrls[i].substr(beginPath.length);
                filePath = file.base;
            }

            // Get content of the css file
            stylesContent += fs.readFileSync(filePath + "/" + styleUrls[i]);
        }

        stylesContent = replaceContent(stylesContent);
        return stylesContent;
    }
    
    return stylesContent;
}

function getHtmlTemplateContent(file, fileContent) {
    var filePath = path.dirname(file.path);
    var htmlTemplateContent = "";

    // Search for templateUrl match
    var templateUrlMatch = fileContent.toString().match(TEMPLATE_URL_PATTERN);
    if (templateUrlMatch) {
        var templateUrl = templateUrlMatch.toString().match(STRING_PATTERN);
        templateUrl[0] = replaceUrl(templateUrl[0]);

        //if absolute path
        var beginPath = './app/';
        if (templateUrl[0].startsWith(beginPath)) {
            templateUrl[0] = templateUrl[0].substr(beginPath.length);
            filePath = file.base;
        }

        // Get content of the html template file
        htmlTemplateContent += fs.readFileSync(filePath + "/" + templateUrl[0]);
        htmlTemplateContent = replaceContent(htmlTemplateContent);

        return htmlTemplateContent;
    }
    
    return htmlTemplateContent;
}

var gulpAngularInsert = function () {
    return through.obj(function (file, enc, cb) {
        //Skip empty file and directory
        if (file.isNull() || file.isDirectory()) { 
            return cb(null, file);
        }

        if (file.isStream()) {
            return cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
        }

        if (file.isBuffer()) {
            var fileContent = file.contents.toString();

            // get htmlTemplate to insert it into the angular component file
            var htmlTemplateContent = getHtmlTemplateContent(file, fileContent);
            fileContent = fileContent.replace(TEMPLATE_URL_PATTERN, "template: '" + htmlTemplateContent + "'");
                
            // get styles to insert it into the angular component file
            var stylesContent = getStyleSheetsContent(file, fileContent);
            fileContent = fileContent.replace(STYLE_URL_PATTERN, "styles: ['" + stylesContent + "']");

            var outBuffer = new Buffer.from(fileContent);
            var newFile = new Vinyl();
            newFile.path = file.path;
            newFile.contents = outBuffer;
            return cb(null, newFile);
        }
    });
};

// Exporting the plugin main function
module.exports = gulpAngularInsert;