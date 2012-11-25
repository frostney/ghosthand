

var fs = require('fs'),
	config = require('./config');

/*
 * GET home page.
 */

module.exports = {
	dashboard: function(req, res) {
	
	},
	page: function(req, res, next){
		if (typeof req.params.page === 'undefined') {
			req.params.page = 'index';
		} 
		
		console.log(req.params.page);
		console.log(config.viewDir + '/' + req.params.page + '.hbs');
		
		fs.stat(config.viewDir + '/' + req.params.page + '.hbs', function(err, stats) {
			if (stats && stats.isFile()) {
				res.render('page', { title: req.params.page });
			} else {
				res.render('page', { title: '404' });
			}
		});
		
	},
	post: function(req, res) {
		
	  console.log(req.params);
	  
	  var filename = config.dataDir + '/post/' + req.params.category + '/' + req.params.year + req.params.month + req.params.day + '-' + req.params.title + '.json';
	  console.log(filename);
	
	  fs.stat(filename, function(err, stats) {
			if (stats && stats.isFile()) {
				fs.readFile(filename, 'utf-8', function(err, data) {
					var fileData = JSON.parse(data);
					
					res.render('post', fileData);
				});
			}
		});
	},
	defaultPost: function(req, res) {
		res.redirect(['/default', req.params.year, req.params.month, req.params.day, req.params.title, req.params.action].join('/'));
	}
};
