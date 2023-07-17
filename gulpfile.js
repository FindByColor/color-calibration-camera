const browser = require('browser-sync')
const colors = require('ansi-colors')
const concat = require('gulp-concat')
const fancyLog = require('fancy-log')
const gulp = require('gulp')
const gulpSass = require('gulp-sass')
const htmllint = require('gulp-htmllint')
// const htmlmin = require('gulp-htmlmin')
const nodeSass = require('node-sass')
const replace = require('gulp-replace')
const rimraf = require('rimraf').sync
const sitemap = require('gulp-sitemap')
const sourcemaps = require('gulp-sourcemaps')
const uglify = require('gulp-uglify')
const version = require('./package.json').version
const workboxBuild = require('workbox-build')

// const assetsPath = 'src/assets/'
const port = process.env.RVW_SERVER_PORT || 8081
const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development'
const isProd = env === 'production'

const sass = gulpSass(nodeSass)

// Theme Scss variables
const scssOptions = {
  errLogToConsole: true,
  outputStyle: 'compressed',
  includePaths: ['./src/scss'],
}

// Erases the dist folder
gulp.task('clean', (done) => {
  rimraf('dist')
  done()
})

// Compile HTML
gulp.task('compile-html', (done) => {
  gulp
    .src('src/*.html')
    // .pipe(htmlmin({ minifyJS: true, removeComments: true, collapseWhitespace: true }))
    .pipe(replace('{{ASSET_PATH}}', '/assets'))
    .pipe(
      replace('{{CACHE_BREAK}}', isProd ? '' : `?ac${new Date().getTime()}`)
    )
    .pipe(replace('{{VERSION}}', version))
    .pipe(gulp.dest('dist'))
    .on('finish', browser.reload)

  done()
})

// Compile js from node modules
// @TODO: Clean up unused code once we finish the site
gulp.task('compile-js', (done) => {
  // gulp
  //   .src([
  //     `${assetsPath}/js/image-capture.polyfill.js`,
  //     `${assetsPath}/js/aframe.js`,
  //     `${assetsPath}/js/aframe-ar.js`
  //   ])
  //   // .pipe(uglify()) // @TODO: Figure out why this causes 'Invalid asm.js: Function use doesn't match definition'
  //   .pipe(concat(`plugins.${version}.min.js`))
  //   .pipe(gulp.dest('dist/assets/js/'))

  // if (browser) {
  //   browser.reload()
  // }

  // done()

  gulp
    .src('src/assets/js/aframe-ar.js')
    // .pipe(uglify())
    .pipe(concat(`aframe-ar.${version}.min.js`))
    .pipe(gulp.dest('dist/assets/js/'))

  gulp
    .src('src/assets/js/aframe.js')
    // .pipe(uglify())
    .pipe(concat(`aframe.${version}.min.js`))
    .pipe(gulp.dest('dist/assets/js/'))

  gulp
    .src('src/assets/js/image-capture.polyfill.js')
    // .pipe(uglify())
    .pipe(concat(`image-capture.polyfill.${version}.min.js`))
    .pipe(gulp.dest('dist/assets/js/'))

  done()
})

// Compile Theme Scss
gulp.task('compile-scss', (done) => {
  if (process.env.NODE_ENV === 'production') {
    gulp
      .src('./src/scss/style.scss')
      .pipe(sass(scssOptions).on('error', sass.logError))
      .pipe(concat(`app.${version}.min.css`))
      .pipe(gulp.dest('dist/assets/css/'))
  } else {
    gulp
      .src('./src/scss/style.scss')
      .pipe(sourcemaps.init())
      .pipe(sass(scssOptions).on('error', sass.logError))
      .pipe(sourcemaps.write())
      .pipe(concat(`app.${version}.min.css`))
      .pipe(gulp.dest('dist/assets/css/'))
  }

  if (browser) {
    browser.reload()
  }

  done()
})

// Copy static assets
gulp.task('copy', (done) => {
  gulp
    .src([
      'src/.htaccess',
      'src/favicon.ico',
      'src/manifest.json',
      'src/oembed.*',
      'src/*.txt',
    ])
    .pipe(gulp.dest('dist/'))
  done()
})

// Copy images to production site
gulp.task('copy-images', (done) => {
  gulp.src('src/assets/img/**/*').pipe(gulp.dest('dist/assets/img/'))
  gulp.src('src/assets/ar/**/*').pipe(gulp.dest('dist/assets/ar/'))
  done()
})

// Compile Service Worker
gulp.task('compile-sw', async (done) => {
  fancyLog(
    `Creating '${colors.cyan('compile-sw')}'... ${colors.dim(
      '( This may take a second )'
    )}`
  )

  await workboxBuild.generateSW({
    mode: process.env.NODE_ENV,
    globDirectory: './dist',
    globPatterns: ['**/*.{html,json,js,css}'],
    swDest: './dist/sw.js',
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
        },
      },
    ],
  })

  done()
})

// Copy Theme js to production site
gulp.task('copy-js', (done) => {
  gulp
    .src('src/js/**/*.js')
    .pipe(uglify())
    .pipe(concat(`app.${version}.min.js`))
    .pipe(gulp.dest('dist/assets/js/'))

  if (browser) {
    browser.reload()
  }

  done()
})

// Starts a BrowserSync instance
gulp.task('server', (done) => {
  setTimeout(() => {
    browser.init({
      https: {
        key: 'https/localhost-key.pem',
        cert: 'https/localhost-cert.pem'
      },
      server: {
        baseDir: 'dist',
        serveStaticOptions: {
          extensions: ['html'],
        },
      },
      port: port,
    })
  }, 3000)

  done()
})

// Generate Sitemap
gulp.task('sitemap', (done) => {
  gulp
    .src(['dist/index.html'], {
      read: false,
    })
    .pipe(
      sitemap({
        siteUrl: 'https://camera.findbycolor.com',
        changefreq: 'monthly',
        lastmod(file) {
          return file && file.ctime ? file.ctime.toString().trim() : Date.now()
        },
        getLoc(siteUrl, loc, entry) {
          return loc.replace(/\.\w+$/, '')
        },
      })
    )
    .pipe(gulp.dest('./dist'))

  done()
})

gulp.task('lint-html', (done) => {
  const reporter = (filepath, issues) => {
    if (issues.length > 0) {
      issues.forEach(function (issue) {
        fancyLog(
          colors.cyan('[lint-html] ') +
            colors.white(
              filepath.replace(__dirname, '.') +
                ' [' +
                issue.line +
                ':' +
                issue.column +
                '] '
            ) +
            colors.red('(' + issue.code + ') ' + issue.msg)
        )
      })

      process.exitCode = 1
    }
  }

  const options = {
    rules: {
      'attr-bans': [],
      'attr-name-style': false,
      'attr-req-value': false,
      'attr-validate': false,
      'class-style': false,
      'doctype-first': false,
      'doctype-html5': true,
      'id-class-no-ad': false,
      'id-class-style': false,
      'id-no-dup': true,
      'img-req-alt': true,
      'indent-width': 2,
      'label-req-for': false,
      'line-end-style': false,
      'line-no-trailing-whitespace': false,
      maxerr: 3,
      'raw-ignore-regex': /\<\!--[^]*?--\>/,
      'spec-char-escape': false,
      'tag-bans': [],
      'tag-close': true,
      'tag-name-match': true,
      'title-max-len': 70,
    },
  }

  gulp.src('dist/**/*.html').pipe(htmllint(options, reporter))

  done()
})

// Watch files for changes
gulp.task('watch', (done) => {
  gulp.watch('src/scss/*', gulp.series('compile-html', 'compile-scss'))
  gulp.watch('src/js/**/*', gulp.series('compile-html', 'copy-js'))
  gulp.watch('src/images/**/*', gulp.series('copy-images'))
  gulp.watch(['src/*.html'], gulp.series('compile-html'))

  done()
})

// Main Gulp Tasks
gulp.task(
  'build',
  gulp.series(
    'clean',
    'copy',
    'compile-js',
    'copy-js',
    'compile-scss',
    'compile-html',
    'copy-images',
    'compile-sw'
  )
)
gulp.task('default', gulp.series('build', 'watch', 'server'))
gulp.task('sitemap', gulp.series('sitemap'))
