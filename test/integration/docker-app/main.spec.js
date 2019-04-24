const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('when using Docker to run application', function() {
    it('should run a test', async function() {
        await browser.url('/');
        const title = await browser.getTitle();
        expect(title).to.eql('Welcome to wdio-docker-service');
    });

    it('should have created a log file', function() {
        const filePath = path.join(process.cwd(), 'docker-log.txt');
        const file = fs.statSync(filePath);
        expect(file.size).to.be.above(0);
    });
});
