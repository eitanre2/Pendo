var r = require('rethinkdb');
var rethinkInit = require('rethinkdb-init');

//init the init :)
rethinkInit(r);

//create the startup state
r.init({
    host: 'localhost',
    port: 28015,
    db: 'pendoPostsDb'
},
    [
        {
            name: 'posts',
            indexes: ["score", "creation"]
        },
        {
            name: 'userVotes',
            primaryKey: 'user2post'
        }
    ]
).catch(function (err) {
    log(undefined, err, true);
}).then(function (conn) {
    log("db created", undefined, true);
});

/**
 * Log a state in init process.
 * @param {string} message - message to print in stdout
 * @param {object} err - Error object, if any
 * @param {boolean} endProcess - when true, exit this process
 */
function log(message, err, endProcess) {
    var now = new Date();
    if (err) {
        console.log("\x1b[31m" + now.toLocaleString() + " :: FAILURE :: " + err.message + "\x1b[0m");
    } else {
        console.log("\x1b[0m" + now.toLocaleString() + " :: " + message + "\x1b[0m");
    }

    if (endProcess === true) {
        process.exit();
    }
}