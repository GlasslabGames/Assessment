/**
 * App Server
 */
var ServiceManager = require('./lib/core/service.manager.js');
var Aeng           = require('./lib/aeng/assessment.js');
var manager        = new ServiceManager("~/hydra.assessment.config.json");

// add all services
manager.add( Aeng );

manager.start();
