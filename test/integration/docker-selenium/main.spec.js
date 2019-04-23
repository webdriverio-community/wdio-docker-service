const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('when using Docker to run Selenium', function () {
    it('should run a test', function () {
        browser.url('/');
        assert.equal(browser.getTitle(), 'WebdriverIO · Next-gen WebDriver test framework for Node.js');
    });

    it('should have created a log file', function () {
        const filePath = path.join(process.cwd(), 'docker-log.txt');
        const file = fs.statSync(filePath);
        assert(file.size > 0);
    });
});
