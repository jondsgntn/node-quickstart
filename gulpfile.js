require('dotenv').config();

//Make sure gulp loads all of the required plugins
//located at 'package.json'
var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')({ camelize: true }),
    lr = require('tiny-lr'),
    server = lr();
var rsync = require('rsyncwrapper');
var browserSync = require('browser-sync').create();
var fs = require('fs');
var GulpSSH = require('gulp-ssh');
var gutil = require('gulp-util');

var errorColoring = '\033[0;31m[ERROR]\033[0m';


// Command line option:
//  --fatal=[warning|error|off]
var fatalLevel = require('yargs').argv.fatal;

var ERROR_LEVELS = ['error', 'warning'];

// Return true if the given level is equal to or more severe than
// the configured fatality error level.
// If the fatalLevel is 'off', then this will always return false.
// Defaults the fatalLevel to 'error'.
function isFatal(level) {
   return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
}

// Handle an error based on its severity level.
// Log all levels, and exit the process for fatal levels.
function handleError(level, error) {
   gutil.log(error.message);
   if (isFatal(level)) {
      process.exit(1);
   }
}

// Convenience handler for error-level errors.
function onError(error) { handleError.call(this, 'error', error);}
// Convenience handler for warning-level errors.
function onWarning(error) { handleError.call(this, 'warning', error);}


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
    dest: process.env.DEPLOY_USER + "@" + process.env.DEPLOY_HOST + ":" + process.env.DEPLOY_PATH,
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


// gulpSSH
//-----------------------
// set server SSH credentials to automate starting the Node server
// once it's deployed
//-----------------------
// execute with 'gulp SSH'

var config = {
  host: '45.55.80.101',
  port: 22,
  username: 'deploy',
  privateKey: fs.readFileSync(process.env.SSH_KEY_LOCATION)
}

var gulpSSH = new GulpSSH({
  ignoreErrors: false,
  sshConfig: config
})

gulp.task('sftp-read', function () {
  return gulpSSH.sftp('read', '/home/deploy/node/.env', {filePath: '.env'})
    .pipe(gulp.dest('logs'))
})

gulp.task('shell', function () {
  return gulpSSH
    .sftp('read', '/home/deploy/node/.env')
      //.on('error', onError)
      .on('error', onWarning)
    //.pipe(shell('cd /home/deploy/node', {filePath: 'shell.log'}))
    //.pipe(gulp.dest('logs'))
});

//set tasks to be executed simultaneously with other tasks when
//the 'default' parameter is provided
gulp.task('default', ['styles', 'scripts']);