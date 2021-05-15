var gulp = require("gulp");
// var jade = require("gulp-jade");
// var sass = require("gulp-sass");
// var plumber = require("gulp-plumber"); //避免出錯就中斷terminal
// var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
// var watch = require("gulp-watch");
var del = require("del");
var mainBowerFiles = require("main-bower-files");
var browserSync = require("browser-sync").create();
var $ = require("gulp-load-plugins")(); //將gulp-套件不用一直宣告
var cleanCSS = require("gulp-clean-css"); //壓縮css
var minimist = require("minimist");
var gulpSequence = require("gulp-sequence");
/*setting default environment option*/
// gulp(預設)
// gulp build --env production =>{ env: 'production' }
const envOptions = {
    string: "env",
    default: { env: "dev" }
};

const options = minimist(process.argv.slice(2), envOptions);
console.log(options); //{ _: [], env: 'dev' }

//  /**/*.副檔名 =>針對所有子資料夾做編譯
gulp.task("copyHTML", function() {
    return gulp
        .src("./source/**/**.html")
        .pipe($.plumber())
        .pipe(gulp.dest("./dist/"))
        .pipe(browserSync.stream()); //網頁刷新
});

gulp.task("jade", function() {
    // var YOUR_LOCALS = {};
    gulp
        .src("./source/**/*.jade")
        .pipe($.plumber())
        .pipe(
            $.jade({
                // locals: YOUR_LOCALS
                pretty: true
            })
        )
        .pipe(gulp.dest("./dist/"))
        .pipe(browserSync.stream());
});

gulp.task("compressImg", function() {
    gulp
        .src("./source/images/*")
        .pipe($.if(options.env == "production", $.imagemin()))
        .pipe(gulp.dest("./dist/images"));
});

gulp.task("sass", function() {
    return (
        gulp
        .src("./source/css/**/*.scss")
        .pipe($.plumber())
        .pipe($.if(options.env == "dev", $.sourcemaps.init())) // 初始化 sourcemaps
        .pipe($.sass().on("error", $.sass.logError))
        //css 編譯完成 新增前綴字
        .pipe($.postcss([autoprefixer()]))
        .pipe($.if(options.env == "production", cleanCSS()))
        .pipe($.if(options.env == "dev", $.sourcemaps.write("."))) // 生成 sourcemaps 文件 (.map)
        .pipe(gulp.dest("./dist/css"))
        .pipe(browserSync.stream())
    );
});

gulp.task("babel", () =>
    gulp
    .src("./source/js/**/*.js")
    .pipe($.plumber())
    .pipe($.if(options.env == "dev", $.sourcemaps.init())) // 初始化 sourcemaps
    .pipe(
        $.babel({
            presets: ["@babel/env"]
        })
    )
    .pipe($.concat("all.js"))
    .pipe(
        $.if(
            options.env == "production",
            $.uglify({
                compress: {
                    drop_console: true //不壓縮console.log
                }
            })
        )
    )
    .pipe($.if(options.env == "dev", $.sourcemaps.write("."))) // 生成 sourcemaps 文件 (.map)
    .pipe(gulp.dest("./dist/js"))
    .pipe(browserSync.stream())
);

gulp.task("bower", function() {
    return gulp
        .src(
            mainBowerFiles({
                overrides: {
                    //針對無法取得的資料，並非所有套件對於 bower 的取用都那麼的友善
                    vue: {
                        // 套件名稱
                        main: "dist/vue.js" // 取用的資料夾路徑
                    }
                }
            })
        )
        .pipe(gulp.dest("./.tmp/vendors"));
    // .pipe(gulp.dest("./dist/vendors"));
});

gulp.task("vendor", ["bower"], function() {
    //[bower]優先執行，沒寫會同時執行而出錯
    return gulp
        .src("./.tmp/vendors/**/*.js")
        .pipe($.order(["jquery.js", "bootstrap.js"])) //合併前先排列順序
        .pipe($.concat("vendor.js")) //合併成一隻檔案
        .pipe(
            $.if(
                options.env == "production",
                $.uglify({
                    compress: {
                        drop_console: true
                    }
                })
            )
        )
        .pipe(gulp.dest("./dist/vendors"));
});

//開啟網頁
gulp.task("openWeb", function() {
    return browserSync.init({
        server: "./dist", //找index0=html
        reloadDebounce: 2000 //減少重新整理次數
    });
});

//刪除檔案
gulp.task("clean", function() {
    return gulp.src(["./.tmp", "./dist"], { read: false }).pipe($.clean());
});

//持續監控 不用一直gulp [任務名稱]
//停止監控ctrl+c
//目前版本的 Watch 並無法監控到 "新增” 及 “刪除” 的檔案更動
//或者是使用另一個 gulp-watch 套件
//https://www.npmjs.com/package/gulp-watch
// gulp.task("watch", function() {
//     gulp.watch("./source/css/**/*.scss", ["sass"]);
//     gulp.watch("./source/**/*.jade", ["jade"]);
//     gulp.watch("./source/**/**.html", ["copyHTML"]);
// });

gulp.task("watch", function() {
    // Endless stream mode
    $.watch(
        ["./source/css/**/*.scss", "./source/**/*.jade", "./source/**/**.html"],
        function() {
            gulp.start("sass");
            gulp.start("jade");
            gulp.start("copyHTML");
        }
    ).on("unlink", function(file) {
        console.log(file);
    });
});

gulp.task('deploy', function() {
    return gulp.src('./dist/**/*')
        .pipe($.ghPages());
});

//gulp 不必加任務名稱 [任務名稱1,任務名稱2...] 依序執行
//一次執行全部任務，不用一直gulp
gulp.task("default", [
    "copyHTML",
    "jade",
    "sass",
    "babel",
    "vendor",
    "openWeb",
    "compressImg",
    "watch"
]);

//gulp build
gulp.task(
    "build",
    gulpSequence(
        "clean",
        "copyHTML",
        "jade",
        "sass",
        "babel",
        "vendor",
        "compressImg",
        "openWeb"
    )
);