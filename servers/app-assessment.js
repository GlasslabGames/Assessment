/**
 * App Server
 */
var ServiceManager = require('./lib/core/service.manager.js');
var Aeng           = require('./lib/aeng/assessment.js');

var manager        = new ServiceManager("~/hydra.assessment.config.json");

// manager.setRouteMap('../routes.internal.map.js');
manager.setName('app-assessment');
// manager.setPort(this.options.services.assessmentPort || 8003);

// add all services
manager.add( Aeng );

manager.start();
