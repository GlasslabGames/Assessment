/**
 * MySQL Module
 * Module dependencies:
 *  lodash - https://github.com/lodash/lodash
 *  when   - https://github.com/cujojs/when
 *  mysql  - https://github.com/felixge/node-mysql
 *
 */
// Third-party libs
var _     = require('lodash');
var when  = require('when');
var mysql = require('mysql');

module.exports = MySQL;

function MySQL(options){

    this.options = _.merge(
        {
            host    : "localhost",
            user    : "",
            password: "",
            database: "",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit:      100000
        },
        options
    );

    this.pool = mysql.createPool(this.options);
}

MySQL.prototype.escape = mysql.escape;

MySQL.prototype.query = function(query) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this.pool.getConnection(function(err, connection) {
        if(err) {
            reject(err);
            return;
        }

        connection.query(query, function(err, data) {
            connection.release();

            if(err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });

// ------------------------------------------------
}.bind(this));
// end promise wrapper
}
