var gulp = require('gulp');
var angularInsert = require('../');

gulp.task('angular-insert', function(){
  gulp.src('./app.component.ts')
  .pipe(angularInsert())
  .pipe(gulp.dest('build'));
});

gulp.task('default', ['angular-insert']);
