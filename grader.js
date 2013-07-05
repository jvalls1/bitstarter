#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var util = require('util');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://localhost:5000";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertUrlFormat = function(inurl) {
    var instr = inurl.toString();
    if (instr.split(' ').length != 1) {
	console.log("%s url is in invalid format. Use --url <server_path> <base_path>. Exiting.", instr);
	process.exit(1);
    }
    return instr;
}

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var cheerioHtmlStream = function(htmlstream) {
    return cheerio.load(htmlstream);
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function(cheerioStream, checksfile) {
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = cheerioStream(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var checkHtmlFile = function(htmlfile, checksfile) {
    var $ = cheerioHtmlFile(htmlfile);
    return checkHtml($, checksfile);
};

var checkHtmlStream = function(fileUrl, checksfile, resultCallback) {
    rest.get(fileUrl).on('complete', function(result, response) {
        if (result instanceof Error) {
            if (response)
                console.error('Error: ' + util.format(response.message));
            else
                console.error('Error: no response from server');
	} else {
            var $ = cheerioHtmlStream(result);
            var checkJson = checkHtml($, checksfile);
            resultCallback(checkJson);
        }
    });
}

var logResult = function(checkJson) {
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
}

if(require.main == module) {
    program
        .option('-c, --checks ', 'Path to checks.json', assertFileExists, CHECKSFILE_DEFAULT)
        .option('-f, --file ', 'Path to index.html', assertFileExists, HTMLFILE_DEFAULT)
        .option('-u, --url [url]', 'Server path followed by the base url', assertUrlFormat, URL_DEFAULT)
        .parse(process.argv);

    if (program.file) {
	var checkJson = checkHtmlFile(program.file, program.checks);
	logResult(checkJson);
    }
    else if (program.url) {
	checkHtmlStream(program.url.toString(), program.checks, logResult);
    }
    else {
	console.log("No file or url specified, exit.");
	process.exit(1);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkHtmlStream = checkHtmlStream;
}
