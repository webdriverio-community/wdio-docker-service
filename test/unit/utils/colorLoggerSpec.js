import { expect } from 'chai';
import { stub } from 'sinon';

describe('Color Logger', function () {
    const ColorLogger = require('../../../src/utils/colorLogger');

    beforeEach(function () {
        stub(ColorLogger, '_writeLog');
    });

    afterEach(function () {
        ColorLogger._writeLog.restore();
    });

    describe('#info', function () {
        context('when a single message string is passed', function () {
            it('must output log with message', function () {
                ColorLogger.info('test');
                expect(ColorLogger._writeLog.calledWith('info', ['test'])).to.eql(true);
            });
        });

        context('when multiple message strings are passed', function () {
            it('must output log with all message strings joined', function () {
                ColorLogger.info('test', 'me', 'out');
                expect(ColorLogger._writeLog.calledWith('info', ['test', 'me', 'out'])).to.eql(true);
            });
        });
    });

    describe('#error', function () {
        context('when a single message string is passed', function () {
            it('must output log with message', function () {
                ColorLogger.error('test');
                expect(ColorLogger._writeLog.calledWith('error', ['test'])).to.eql(true);
            });
        });

        context('when multiple message strings are passed', function () {
            it('must output log with all message strings joined', function () {
                ColorLogger.error('test', 'me', 'out');
                expect(ColorLogger._writeLog.calledWith('error', ['test', 'me', 'out'])).to.eql(true);
            });
        });
    });

    describe('#warn', function () {
        context('when a single message string is passed', function () {
            it('must output log with message', function () {
                ColorLogger.warn('test');
                expect(ColorLogger._writeLog.calledWith('warn', ['test'])).to.eql(true);
            });
        });

        context('when multiple message strings are passed', function () {
            it('must output log with all message strings joined', function () {
                ColorLogger.warn('test', 'me', 'out');
                expect(ColorLogger._writeLog.calledWith('warn', ['test', 'me', 'out'])).to.eql(true);
            });
        });
    });

    describe('#log', function () {
        context('when a single message string is passed', function () {
            it('must output log with message', function () {
                ColorLogger.log('test');
                expect(ColorLogger._writeLog.calledWith('log', ['test'])).to.eql(true);
            });
        });

        context('when multiple message strings are passed', function () {
            it('must output log with all message strings joined', function () {
                ColorLogger.log('test', 'me', 'out');
                expect(ColorLogger._writeLog.calledWith('log', ['test', 'me', 'out'])).to.eql(true);
            });
        });
    });


});
