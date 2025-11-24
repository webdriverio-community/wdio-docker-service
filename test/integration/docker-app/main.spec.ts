import { statSync } from 'node:fs'
import { join } from 'node:path'

describe('when using Docker to run application', function() {
    it('should run a test', async function() {
        await browser.url('/')
        const title = await browser.getTitle()
        expect(title).toEqual('Welcome to wdio-docker-service')
    })

    it('should have created a log file', function() {
        const filePath = join(process.cwd(), 'docker-log.txt')
        const file = statSync(filePath)
        expect(file.size).toBeGreaterThan(0)
    })
})
