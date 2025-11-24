import path from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import getFilePath from '@root/utils/getFilePath.js'

describe('#getFilePath', function () {
    let basePath: string
    let defaultFilename: string

    beforeAll(function () {
        basePath = process.cwd()
        defaultFilename = 'docker-standalone.txt'
    })

    it('should handle dir "./"', function () {
        const dir = './'
        const expectedPath = path.join(basePath, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "/', function () {
        const dir = '/'
        const expectedPath = path.join(dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "./log"', function () {
        const dir = './log'
        const expectedPath = path.join(basePath, dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "/log', function () {
        const dir = '/log'
        const expectedPath = path.join(dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "./log/"', function () {
        const dir = './log/'
        const expectedPath = path.join(basePath, dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "/log/', function () {
        const dir = '/log/'
        const expectedPath = path.join(dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "./log/docker"', function () {
        const dir = './log/docker'
        const expectedPath = path.join(basePath, dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "log"', function () {
        const dir = 'log'
        const expectedPath = path.join(basePath, dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle dir "/log/docker', function () {
        const dir = '/log/docker'
        const expectedPath = path.join(dir, defaultFilename)
        const filePath = getFilePath(dir, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file ".log"', function () {
        const file = '.log'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "./.log"', function () {
        const file = './.log'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "./log/.log"', function () {
        const file = './log/.log'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "./docker-log.txt"', function () {
        const file = './docker-log.txt'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "docker-log.txt"', function () {
        const file = 'docker-log.txt'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "/docker-log.txt', function () {
        const file = 'docker-log.txt'
        const expectedPath = file
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "./log/docker-log.txt"', function () {
        const file = './log/docker-log.txt'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "log/docker-log.txt"', function () {
        const file = 'log/docker-log.txt'
        const expectedPath = path.join(basePath, file)
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })

    it('should handle file "/log/docker-log.txt', function () {
        const file = 'log/docker-log.txt'
        const expectedPath = process.platform === 'win32' ? '\\log\\docker-log.txt' : file
        const filePath = getFilePath(file, defaultFilename)

        expect(filePath).toContain(expectedPath)
    })
})
