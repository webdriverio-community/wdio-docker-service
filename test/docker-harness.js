/*! docker-harness.js */

const Docker = require("../lib/utils/docker");

const seleniumDocker = new Docker("selenium/standalone-firefox", {
    debug: true,
    options: {
        p: ["4444:4444"],
        shmSize: "2g"
    }
});

seleniumDocker.run().then(() => {

});
