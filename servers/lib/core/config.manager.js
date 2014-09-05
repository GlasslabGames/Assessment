/**
 * Created by Joseph Sutton on 11/30/13.
 * Config file load
 *   - Multi file loading until success
 *   - Config
 */
var fs = require('fs');
var _  = require('lodash');

function ConfigManager(){
    this.config = {};
}

ConfigManager.prototype.loadSync = function(files, fileType) {
    if(_.isString(files)) {
        files = [files];
    }
    if(_.isEmpty(fileType)) {
        fileType = "json";
    }

    if(_.isArray(files)) {
        var data = "";
        var file = "";
        try {
            for(var i = 0; i < files.length; i++){
                file = files[i];
                file = file.replace("~", this.getUserHomeDir());

                if(fs.existsSync(file)) {
                    data = fs.readFileSync(file);

                    if(fileType == "json") {
                        // merge in next
                        this.config = _.merge(
                            this.config,
                            JSON.parse(data)
                        );
                    }
                } else {
                    console.info("ConfigManager: Loading file \"" + file + "\" failed");
                }
            }

            if(_.isElement(this.config)) {
                return null;
            } else {
                return this.config;
            }
        } catch(err){
            console.error("ConfigManager: Error loading config files (",files,"):", err);
        }
    } else {
        console.error("ConfigManager: Files input not array or string");
    }

    return null;
};

ConfigManager.prototype.get = function() {
    return this.config;
}

ConfigManager.prototype.getUserHomeDir = function() {
    return process.env.HOME ||
           process.env.HOMEPATH ||
           process.env.USERPROFILE ||
           "/root";
};

module.exports = ConfigManager;
