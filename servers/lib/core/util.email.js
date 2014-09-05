var fs             = require('fs');
var path           = require('path');
var _              = require('lodash');
var when           = require('when');
var nodemailer     = require('nodemailer');
var ejs            = require('ejs');
var qFS            = require('q-io/fs');

module.exports = EmailUtil;

ejs.open = '{{';
ejs.close = '}}';

function EmailUtil(options, templatesDir, stats){
    this.options = options;
    this.templatesDir = templatesDir;
    this.stats = stats;
}

EmailUtil.prototype.test = function(templateName, emailData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    this.build(templateName, emailData)
        .then(function(templateData){

            resolve(templateData.html);
            //resolve(templateData.text);

        }.bind(this))

        // errors
        .then(null, function(err){
            if(this.stats) this.stats.increment("error", "Email."+templateName+".ReadingTemplates");
            console.error("Email: Error reading templates -", err);
            reject({error: "internal error, try again later"});
        }.bind(this));
// ------------------------------------------------
}.bind(this));
// end promise wrapper
}

EmailUtil.prototype.build = function(templateName, emailData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var mainHtmlFile = path.join(this.templatesDir, "main-template", "html.ejs");
    var mainTextFile = path.join(this.templatesDir, "main-template", "text.ejs");
    var htmlFile = path.join(this.templatesDir, templateName, "html.ejs");
    var textFile = path.join(this.templatesDir, templateName, "text.ejs");
    var emailHtml, emailText;
    var promiseList = [];

    emailData.$imageDir = path.join(this.templatesDir, templateName, "images");

    this._renderFile(mainHtmlFile, htmlFile, emailData)
        .then(function(body){
            emailHtml = body;

            return this._renderFile(mainTextFile, textFile, emailData);
        }.bind(this))
        // text rendered data
        .then(function(body){
            emailText = body;
        }.bind(this))
        // send html/text back
        .then(function(){
            resolve({
                html: emailHtml,
                text: emailText
            })
        }.bind(this))
        // errors
        .then(null, function(err) {
            if(this.stats) this.stats.increment("error", "Email."+templateName+".ReadingTemplates");
            console.error("Email: Error reading templates -", err);
            reject({error: "internal error, try again later"});
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
}

EmailUtil.prototype._renderFile = function(mainFile, tmplfile, emailData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var tmplFileData, mainFileData, p;
    var promiseList = [];

    p = qFS.read(tmplfile)
        .then(function(fileData) {
            tmplFileData = fileData;
        }.bind(this));
    promiseList.push(p);

    p = qFS.read(mainFile)
        .then(function(fileData) {
            mainFileData = fileData;
        }.bind(this));
    promiseList.push(p);

    when.all(promiseList)
        .then(function() {
            var body = null;
            if(tmplFileData) {
                //console.log("fileData:", fileData);
                body = ejs.render(tmplFileData, _.merge({
                    //cache: false,
                    //filename: tmplfile
                }, emailData)
                );
            }

            if(mainFileData) {
                //console.log("emailData:", emailData);
                body = ejs.render(mainFileData, _.merge({
                    //cache: false,
                    //filename: mainFile,
                    body: body
                }, emailData)
                );
            }

            resolve(body);

        }.bind(this))
        // errors
        .then(null, function(err) {
            reject(err);
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
}


EmailUtil.prototype.send = function(templateName, emailData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this.build(templateName, emailData)
        .then(function(templateData){

            var transport = nodemailer.createTransport("SMTP", this.options.transport);
            var emailSettings = {
                from:    this.options.from,
                to:      emailData.to,
                subject: emailData.subject,
                html:    templateData.html,
                text:    templateData.text,
                generateTextFromHTML: true,
                forceEmbeddedImages: true
            };

            transport.sendMail(emailSettings, function(err, responseStatus) {
                if (err) {
                    if(this.stats) this.stats.increment("error", "Email."+templateName+".SendEmail");
                    console.error("Email: Error sending email -", err);

                    if(process.env.HYDRA_ENV == "dev") {
                        // if dev env it's ok if email does not work
                        resolve(200);
                    } else {
                        reject({error: "internal error, try again later"});
                    }
                } else {
                    if(this.stats) this.stats.increment("info", "Email."+templateName+".SendEmail");
                    //console.log(responseStatus.message);
                    resolve(responseStatus);
                }
            }.bind(this));
        }.bind(this))

        // errors
        .then(null, function(err){
            if(this.stats) this.stats.increment("error", "Email."+templateName+".ReadingTemplates");
            console.error("Email: Error reading templates -", err);
            reject({error: "internal error, try again later"});
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
}