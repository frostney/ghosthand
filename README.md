Ghosthand
=========

Ghosthand is a lightweight blog engine for Node.js. Ghosthand share some similarities with Jekyll for example in that every blog post/page is a physical file on the disk. Unlike Jekyll, Ghosthand is NOT a static site generator and the blog is being served as a dynamic site. Like many blog engines, Ghosthand can be used as a simplistic content management system as well.

To start the blog simply type `node app.js` in a console. By default, Ghosthand runs on port 3000, so open up a web browser and navigate to `http://localhost:3000` to see the results.

Ghosthand might take a bit to load up if it's started as it loads all articles into memory. Depending on your disk speed and size of the site, this could take a few seconds.

Disclaimer: This project is very much alpha right now.

Features
--------

* Does not need a database
* Optional metadata for each page/post
* Each blog post/page can be edited in any text editor
* Support for different layouts
* Support for LESS
* Markdown support
* Uses Handlebars templing engine

Adding new articles (page or blog post)
---------------------------------------

By default, all pages and posts can be found in `/site/articles`. (This can be changed in the global configuration if needs be.)

Ghosthand mimics the filesystem structure as its routes:
	about.md -> /about
	folder/index.md -> /folder
	folder/mypage.md -> /folder/mypage

You can define metadata for each article by adding a JSON object between two metadata separators (`---`). This is an example:
	---
	{
		"author": "Someone",
		"title": "Title",
		"whoop": "whoop whoop",
	}
	---

Make sure your metadata object is valid JSON. (To be honest, I'm not quite sure what will happen if it's not. It probably crashes.)

You can access any attributes from the metadata in your article using the Handlebars syntax:  
For example `{{whoop}}` will output `whoop whoop` in the article when the site is being called.

If you wish to have a more blog-like route like you may have seen in Wordpress, you just need rename the filename to `20121201-test.md` and this article will be served at `/2012/12/01/test`.


Global configuration
--------------------

Open up `config.json` for changing technical details, such as the port where the blog is being served on, the directories where the site is and the metadata separator for example.

To configure the site name, logo or description open `global.json`.

If you want to configure the default metadata, take a look at `metadata.json`. This metadata information will be used if no metadata for a article has been specified.


License
-------

MIT

See LICENSE.md for more details