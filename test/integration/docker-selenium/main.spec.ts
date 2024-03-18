import { expect } from 'chai';
import { statSync } from 'fs';
import { join } from 'path';

describe('when using Docker to run Selenium', function() {
    it('should run a test', async function() {
        await browser.url('/');
        const title = await browser.getTitle();
        expect(title).to.eql('WebdriverIO · Next-gen browser and mobile automation test framework for Node.js | WebdriverIO');
    });

    it('should have created a log file', function() {
        const filePath = join(process.cwd(), 'docker-log.txt');
        const file = statSync(filePath);
        expect(file.size).to.be.above(0);
    });
});
