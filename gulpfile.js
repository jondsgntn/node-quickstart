require('dotenv').config();

//Make sure gulp loads all of the required plugins
//located at 'package.json'
var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')({ camelize: true }),
    lr = require('tiny-lr'),
    server = lr()
var rsync = require('rsyncwrapper')
var browserSync = require('browser-sync').create();
var fs = require('fs')

//stylesheet tasks for minifying and concating
//--------------------
//takes any .scss files located in '/assets/css/src/', converts
//them to .css, prefixes and minifies the CSS, then combines
//the CSS at '/style.min.css'
//--------------------
//execute with 'gulp styles'

gulp.task('styles', function() {
  return gulp.src('./public/stylesheets/src/*.css')
         .pipe(plugins.autoprefixer('last 2 versions', 'ie 9', 'ios 6', 'android 4'))
         .pipe(gulp.dest('./public/stylesheets/build'))
         .pipe(plugins.minifyCss({ keepSpecialComments: 1 }))
         .pipe(plugins.livereload(server))
         .pipe(plugins.concat('style.css'))
         .pipe(plugins.rename({ suffix: '.min' }))
         .pipe(gulp.dest('./public/stylesheets'))
         .pipe(browserSync.stream())
         .pipe(plugins.notify({ message: 'Styles task complete' }));
});

//javascript tasks
//---------------------
//takes any .js files located in 'assets/js/src', combines them,
//minifies the javascript, then stores it at '/assets/js/scripts.min.js'
//---------------------
//execute with 'gulp scripts'

gulp.task('scripts', function() {
  return gulp.src(['./public/javascripts/src/*.js'])
         .pipe(plugins.concat('scripts.js'))
         .pipe(gulp.dest('./public/javascripts/build'))
         .pipe(plugins.rename({ suffix: '.min' }))
         .pipe(plugins.uglify())
         .pipe(plugins.livereload(server))
         .pipe(gulp.dest('./public/javascripts'))
         .pipe(browserSync.stream())
         .pipe(plugins.notify({ message: 'Scripts task complete' }));
});

//image tasks
//---------------------
//takes all .png, .jpg, and .gif files located in '/assets/img/'
//and optimizes them for the web
//---------------------
//execute with 'gulp images'

gulp.task('images', function() {
  return gulp.src(['./public/images/*.{png,jpg,gif}'])
         .pipe(plugins.imagemin({ optimizationLevel: 7, progressive: true }))
         .pipe(plugins.livereload(server))
         .pipe(gulp.dest('./public/images'))
         .pipe(browserSync.stream())
         .pipe(plugins.notify({ message: 'Images task complete' }));
});

//deploy
//-----------------------
//take project (minus excluded files/directory) and deploy it to the
//server using SSH credentials
//-----------------------
//execute with 'gulp deploy'

gulp.task('deploy', ['default'], function() {
  rsync({
    ssh: true,
    src: './',
    dest: process.env.DEPLOY_PATH,
    port: process.env.DEPLOY_PORT,
    recursive: true,
    syncDest: false,
    //include 3rd party JS libraries located in '/assets/js/lib'
    include: ['public/javascripts/lib'],
    //exclude non-minified directories
    exclude: ['.git', '.gitignore', 'assets/manifest.json',
              'public/stylesheets/src', 'public/stylesheets/build',
              'public/javascripts/src', 'public/javascripts/build',
              'node_modules', '.env', 'gulpfile.js'],
    args: ['--verbose']
  }, function(error, stdout, stderr, cmd) {
      console.log(stdout);
  });
});


//set tasks to be executed simultaneously with other tasks when
//the 'default' parameter is provided
gulp.task('default', ['styles', 'scripts']);