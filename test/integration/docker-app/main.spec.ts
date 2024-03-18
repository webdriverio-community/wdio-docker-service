import { expect } from 'chai';
import { statSync } from 'fs';
import { join } from 'path';

describe('when using Docker to run application', function() {
    it('should run a test', async function() {
        await browser.url('/');
        const title = await browser.getTitle();
        expect(title).to.eql('Welcome to wdio-docker-service');
    });

    it('should have created a log file', function() {
        const filePath = join(process.cwd(), 'docker-log.txt');
        const file = statSync(filePath);
        expect(file.size).to.be.above(0);
    });
});
