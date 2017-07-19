'use strict';
var mongoose = require('mongoose');
var assert = require('assert');
var SchemaBuilder = require('./SchemaBuilder');

var Mongo = function () {
    this.db = {};//will be filled with model names as keys
    this.connection = null;
};

Mongo.prototype = {
    /**
     * Connect to a mongo database using mongoose
     * @param serverConfigOptions
     * @param serverConfigOptions.mongoose
     * @param serverConfigOptions.mongoose.debug
     * @param serverConfigOptions.mongoUrl
     * @param serverConfigOptions.majors
     * @param done
     */
    connect: function (serverConfigOptions, done) {
        var self = this;
        assert(serverConfigOptions.mongoUrl, 'connect mongoUrl serverConfigOptions');
        this.db._mongoose = mongoose;
        mongoose.set('debug', serverConfigOptions.mongoose && serverConfigOptions.mongoose.debug);
        this.db.majors = serverConfigOptions.majors;
        this.connection = mongoose.createConnection(serverConfigOptions.mongoUrl, serverConfigOptions.mongoose, function (err) {
            if (err) {
                return done(err);
            }
            done(null, self.db, { //TODO: refactor this for readability and usage of schemas
                /**
                 * Initializes a schema with the speicified name and schema. Additionally provides a setup function (schema, major) that can be used for fine-tuning behavior.
                 * @param name {String}
                 * @param schema {Object}
                 * @param [options] {multiple ...}
                 * @param [setupFunction] {Function}
                 */
                initializeSchema: function (name, schema, options, setupFunction) {
                    return SchemaBuilder.build(self, name, schema, options, setupFunction);
                },
                Types: mongoose.Types,
                Schema: mongoose.Schema
            });
        });
    },
    Schema: mongoose.Schema
};

Mongo.initialize = function () {
    require('mongoose').Promise = require('q').Promise;
};

module.exports = function setup(options, imports, register) {
    Mongo.initialize();
    SchemaBuilder.initialize(options, imports);
    register(null, {
        mongo: Mongo
    });
};