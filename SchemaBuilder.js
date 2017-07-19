'use strict';
var _ = require('lodash');
var findOneOrCreate = require('mongoose-find-one-or-create');
var utilities;

function lowercaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

var SchemaBuilder = {};
SchemaBuilder.initialize = function (opts, imports) {
    utilities = imports.utilities;
};

SchemaBuilder.buildSingleSchema = function (mongo, name, schema, schemaOptions, setupFunction, major) {
    var collection = schemaOptions.collection || lowercaseFirstLetter(name);
    if (major) {
        collection = collection + '.' + major;
        name = name + '.' + major;
    }
    var options = _.defaults({collection: collection}, schemaOptions);
    var singleSchema = new mongo.Schema(schema, options);
    singleSchema.plugin(findOneOrCreate);
    singleSchema.setTransform = function (transform, clear) {
        if (transform) {
            if (typeof(transform) !== 'function') {
                var props = transform.concat([]);

                transform = function (doc) {
                    var res = utilities.transformThatObject(doc, props);
                    if (clear) {
                        res = utilities.getClearObject(res);
                    }
                    return res;
                };
            }
            singleSchema.set('toJSON', {
                transform: transform
            });
        }
    };
    (function (name, setupFunction, major) {
        singleSchema.virtual('major').get(function () {
            if (major) {
                return major;
            } else {
                throw new Error(`${name} is not multiple Schema. Trying to access system virtual property 'major' is not allowed.`);
            }
        });

        if (typeof setupFunction === 'function') {
            setupFunction(singleSchema, major);
        }
    }(name, setupFunction, major));
    return mongo.connection.model(name, singleSchema);
};

SchemaBuilder.build = function (mongo, name, schema, schemaOptions, setupFunction) {
    if (typeof schemaOptions === 'function') {
        setupFunction = schemaOptions;
        schemaOptions = null;
    }

    schemaOptions = _.extend({}, schemaOptions);
    if (schemaOptions.multiple) {
        var majors = mongo.db.majors;
        if (majors.length === 0) {
            throw new Error(name + ' defined as multiple schema, server not configured for majors.');
        }
        var schemas = {};
        _.each(majors, function (major) {
            schemas[major] = SchemaBuilder.buildSingleSchema(mongo, name, schema, schemaOptions, setupFunction, major);
        });

        mongo.db[name] = (function (schemas) {
            return function (major) {
                if (!major) {
                    throw new Error(major + ' not a valid major for database selection.');
                }
                var schema = schemas[major];
                if (!schema) {
                    throw new Error(major + ' does not exist as a valid major for database selection.');
                }
                return schema;
            };
        }(schemas));
        mongo.db[name].multiple = true;
    } else {
        mongo.db[name] = SchemaBuilder.buildSingleSchema(mongo, name, schema, schemaOptions, setupFunction);
    }
    console.log(name + (schemaOptions.multiple ? ' [' + mongo.db.majors.join(',') + ']' : '') + ' schema initialized!');
    return mongo.db[name];
};

module.exports = SchemaBuilder;