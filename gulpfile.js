'use strict';

// Note: use this Chrome plugin to enable the Live Reload feature:
// https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei

var gulp = require('gulp');
var beep = require('beepbeep');
var colors = require('colors');
var $ = require('gulp-load-plugins')();
var config = require('./src/config.json');

var paths = {
    scripts: ['src/js/*.js'],
    stylus:  ['src/stylus/*.styl'],
    images:  ['src/img/**/*'],
    css:     ['src/css/**/*.css'],
    jade:    ['src/**/*.jade'],
    jadePages:    ['src/**/*.jade', '!src/partials/*.jade'],
    statics: ['src/statics/**/*'],
    articles: ['src/articles/*.md']
};

var dest = {
    build:  'build',
    articles: 'build/articles',
    css:    'build/css'
};

var onError = function(err) {
    beep();
    console.log('⍨'.bold.red + ' ' + err);
};

// Lint Task
gulp.task('lint', function() {
    return gulp.src(paths.scripts)
        .pipe($.jshint())
        .pipe($.jshint.reporter('default'));
});

gulp.task('css', function() {
    return gulp.src(paths.css)
        .pipe(gulp.dest(dest.css));
});

gulp.task('revall', function() {
    return gulp.src('build/**')
        .pipe($.revAll())
        .pipe(gulp.dest('s3'));
});

// Compile Our Stylus files
gulp.task('stylus', function() {
    return gulp.src(paths.stylus)
        .pipe($.plumber({errorHandler: onError }))
        .pipe($.stylus())
        .pipe($.autoprefixer())
        .pipe($.header('/* Copyright 2014 Scott Stanfield */\n'))
        .pipe(gulp.dest(dest.css))
        .pipe($.rename({suffix: '.min'}))
        .pipe($.minifyCss())
        .pipe(gulp.dest(dest.css));
});

gulp.task('jade', function() {
    return gulp.src(paths.jadePages)
        .pipe($.plumber({errorHandler: onError }))
        .pipe($.jade({pretty: true, locals:config}))
        .pipe(gulp.dest(dest.build));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src(paths.scripts)
        .pipe($.plumber({errorHandler: onError }))
        .pipe($.concat('all.js'))
        .pipe(gulp.dest(dest.build + '/js'))
        .pipe($.rename('all.min.js'))
        .pipe($.uglify())
        .pipe(gulp.dest(dest.build + '/js'));
});

gulp.task('images', function() {
    return gulp.src(paths.images)
        // commenting out imagemin for now since the npm install takes so long
        // as it compiles some files from source
        // to get it back: npm install --save-dev imagemin
        //
        // .pipe($.cache($.imagemin({
        //     optimizationLevel: 7,
        //     progressive: true,
        //     interlaced: true
        // })))
        .pipe(gulp.dest(dest.build + '/img'))
        .pipe($.size());
});

gulp.task('clean', function() {
    gulp.src(dest.build, {read:false})
        .pipe($.rimraf());
});

// gulp.task('root', function() {
//     gulp.src(paths.root)
//         .pipe(gulp.dest(dest.build))
// });

// gulp.task('statics', function() {
//     gulp.src(paths.statics)
//         .pipe(gulp.dest(dest.build + '/statics'));
// });

gulp.task('cache', function() {
    $.cache.clearAll();
});

gulp.task('webserver', function() {
    gulp.src(['build', '!node_modules'])
        .pipe($.webserver({
            livereload: true,
            open: true
        }));
});

gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.stylus, ['stylus']);
    gulp.watch(paths.css, ['css']);
    gulp.watch(paths.articles, ['articles']);
    gulp.watch(paths.jade, ['jade']);
});

gulp.task('articles', function(){
   return gulp.src(paths.articles)
        .pipe($.plumber({errorHandler: onError }))
        .pipe($.frontMatter({property: 'data', remove: true}))
        .pipe($.marked({smartypants: true}))
        .pipe(utils._summarize('<!--more-->'))
        .pipe(utils._filenameToDate())
        .pipe(utils._collectArticles())
        .pipe(utils._convertToHtml());
});

gulp.task('default', [ 'articles', 'stylus', 'scripts', 'images', 'css']);
gulp.task('debug', [ 'webserver',  'articles', 'stylus', 'scripts', 'images', 'css', 'watch']);


var regexPostName   = /(\d{4})-(\d{1,2})-(\d{1,2})-(.*)/;

var path = require('path');
var through = require('through2');
var utils = {

    _summarize: function(marker) {
        return through.obj(function (article, enc, callback) {                
            var summary = article.contents.toString().split(marker)[0]
            article.data.summary = summary;
            this.push(article);
            callback();
        });
    },

    _filenameToDate: function() {
        return through.obj(function (article, enc, callback) {                
            var basename = path.basename(article.path, '.md');
            var match = regexPostName.exec(basename);
            if (match)
            {
                var year     = match[1];            
                var month    = match[2];
                var day      = match[3];
                var basename = match[4];
                article.data.date = new Date(year + "-" + month + "-" + day);
                article.data.url  = '/' + year + '/' + month + '/' + day + '/' + basename + '.html';
            }

            this.push(article);
            callback();
        });
    },

    _collectArticles: function() {
        var articles = [];       
        var tags = [];
        return through.obj(function (article, enc, callback) {
            articles.push(article.data);
            articles[articles.length - 1].content = article.contents.toString();

            if (article.data.tags) {
                article.data.tags.forEach(function (tag) {
                    if (tags.indexOf(tag) == -1) {
                        tags.push(tag);
                    }
                });
            }else{
                tags.push("");
            }

            this.push(article);
            callback();
        },
        function (callback) {
            articles.sort(function (a, b) {
                return b.date - a.date;
            });
            config.posts = articles;
            config.tags = tags;
            callback();
        });
    },
    
    _convertToHtml: function(){
        return through.obj(function (article, enc, callback){        
            gulp.src('src/jade/partials/article.jade')
                .pipe($.plumber({errorHandler: onError }))
                .pipe($.jade({pretty: true, locals: article.data}))
                .pipe($.rename(function(path){
                    path.basename = article.data.fileTitle;
                }))
                .pipe(gulp.dest(dest.articles));
            
            this.push(article);
            callback();
        }, function(callback){
            gulp.src(paths.jadePages)
                .pipe($.plumber({errorHandler: onError }))
                .pipe($.jade({pretty: true, locals: config}))
                .pipe(gulp.dest(dest.build));
            callback();
        });
    },
};

