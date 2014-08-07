/**
 * Ensures that errors from other APIs conform to Mocha.
 * @param done
 * @returns {Function}
 */
function mochaError (done) {
    return function (err) {
        done(new Error(err));
    }
}