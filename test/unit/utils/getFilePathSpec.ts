import getFilePath from '../../../src/utils/getFilePath.ts';
import path from 'path';
import { expect } from 'chai';

describe('#getFilePath', function () {
    before(function () {
        this.basePath = process.cwd();
        this.defaultFilename = 'docker-standalone.txt';
    });

    it('should handle dir "./"', function () {
        const dir = './';
        const expectedPath = path.join(this.basePath, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "/', function () {
        const dir = '/';
        const expectedPath = path.join(dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "./log"', function () {
        const dir = './log';
        const expectedPath = path.join(this.basePath, dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "/log', function () {
        const dir = '/log';
        const expectedPath = path.join(dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "./log/"', function () {
        const dir = './log/';
        const expectedPath = path.join(this.basePath, dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "/log/', function () {
        const dir = '/log/';
        const expectedPath = path.join(dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "./log/docker"', function () {
        const dir = './log/docker';
        const expectedPath = path.join(this.basePath, dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "log"', function () {
        const dir = 'log';
        const expectedPath = path.join(this.basePath, dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle dir "/log/docker', function () {
        const dir = '/log/docker';
        const expectedPath = path.join(dir, this.defaultFilename);
        const filePath = getFilePath(dir, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file ".log"', function () {
        const file = '.log';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "./.log"', function () {
        const file = './.log';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "./log/.log"', function () {
        const file = './log/.log';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "./docker-log.txt"', function () {
        const file = './docker-log.txt';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "docker-log.txt"', function () {
        const file = 'docker-log.txt';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "/docker-log.txt', function () {
        const file = 'docker-log.txt';
        const expectedPath = file;
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "./log/docker-log.txt"', function () {
        const file = './log/docker-log.txt';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "log/docker-log.txt"', function () {
        const file = 'log/docker-log.txt';
        const expectedPath = path.join(this.basePath, file);
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });

    it('should handle file "/log/docker-log.txt', function () {
        const file = 'log/docker-log.txt';
        const expectedPath = process.platform === 'win32' ? '\\log\\docker-log.txt' : file;
        const filePath = getFilePath(file, this.defaultFilename);

        expect(filePath).to.contain(expectedPath);
    });
});
