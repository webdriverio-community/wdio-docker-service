import { statSync } from 'node:fs'
import { join } from 'node:path'

describe('when using Docker to run Selenium', function() {
    it('should run a test', async function() {
        await browser.url('/')
        const title = await browser.getTitle()
        expect(title).toEqual('WebdriverIO · Next-gen browser and mobile automation test framework for Node.js | WebdriverIO')
    })

    it('should have created a log file', function() {
        const filePath = join(process.cwd(), 'docker-log.txt')
        const file = statSync(filePath)
        expect(file.size).toBeGreaterThan(0)
    })
})
