/**
 * App Server
 */
var path           = __dirname;
var ServiceManager = require(path + '/lib/core/service.manager.js');
var Aeng           = require(path + '/lib/aeng/assessment.js');

var manager        = new ServiceManager("~/hydra.assessment.config.json");

// manager.setRouteMap('../routes.internal.map.js');
manager.setName('app-assessment');
// manager.setPort(this.options.services.assessmentPort || 8003);

// add all services
manager.add( Aeng );

manager.start();
