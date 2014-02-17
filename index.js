'use strict';

var _ = require('lodash');
var util = require('util');
var mkdirp = require('mkdirp');
var fs = require('fs');

var cheerio = require('cheerio');
var request = require('request');
var trim = require('fasttrim').trim;

var async = require('async');
var bower = require('bower');

var fetchUrl = function(file, cb){
  request.get(file, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      cb(null, body);
    } else{
      cb(err);
    }
  });
};

var getContent = function(body) {
  var $ = cheerio.load(body);
  return trim($('.license-text').text());
};

var getLicenseContent = function(item) {
  var mapping = {
    '<year>': (new Date()).getFullYear(),
    '<copyright holders>': item.name
  };

  _.each(_.keys(mapping), function(key) {
    item.content = item.content.replace(
      new RegExp(key, 'g'), mapping[key]
    );
  });

  return item.content;
};

var writeLicense = function(item, opts) {
  var path = opts.path ?
    opts.path : '.';

  var filename = util.format('%s/%s-%s.txt',
    path, item.name, item.version
  );


  mkdirp(path, function(err) {
    if (err) {
      console.error(err);
    }
    else {
      fs.writeFile(filename, getLicenseContent(item), function(err) {
        if (err) {
          console.log(err);
        }
      });
    }
  });
};

module.exports = function(opts) {
  bower.commands
    .list({}, { offline: true })
    .on('error', function (err) {
      console.error(err.message);
    })
    .on('end', function (list) {
      var items = [];

      async.each(
        _.keys(list.dependencies),
        function(component, next) {
          var pkgMeta = list.dependencies[component].pkgMeta;
          var item = {
            name: pkgMeta.name,
            version: pkgMeta.version
          };

          if (!pkgMeta.license) {
            items.push(item);
            next(); return;
          }

          fetchUrl(
            util.format(
              'http://spdx.org/licenses/%s',
              pkgMeta.license.toUpperCase()
            ),
            function(err, body) {
              items.push(_.merge(item, {
                license: pkgMeta.license,
                content: getContent(body)
              }));

              next();
            }
          );
        },
        function() {
          var output = ["\n"];

          _.each(items, function(item) {
            var name = util.format('%s %s',
              item.name, item.version
            );

            if (item.content) {
              writeLicense(item, opts);
              output.push(util.format("= %s - %s\n",
                name, item.license
              ));
            }
            else {
              output.push(util.format(
                "= %s - no license\n", name
              ));
            }
          });

          output.push("\n");
          process.stdout.write(output.join(''));
        }
      );
    });
}
