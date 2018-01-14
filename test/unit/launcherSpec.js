import { expect } from 'chai';
import { stub, spy } from 'sinon';
import Docker from '../../src/utils/docker';

describe('DockerLauncher', function () {
    const ColorLogger = require('../../src/utils/color-logger');
    const DockerLauncher = require('../../src/launcher');
    let launcher;

    beforeEach(function () {
        launcher = new DockerLauncher();
        stub(Docker.prototype, 'run').returns(Promise.resolve());
    });

    afterEach(function () {
        Docker.prototype.run.restore();
    });

    describe('#constructor', function () {

        it('must initialize class properties', function () {
            expect(launcher.docker).to.eql(null);
            expect(launcher.dockerLogs).to.eql(null);
            expect(launcher.logToStdout).to.eql(false);
        });
    });

    describe('#onPrepare', function () {
        describe('@dockerOptions', function () {
            context('when dockerOptions.image is not provided', function () {
                const dockerOptions = {};
                it('must reject with error', function () {
                    return launcher.onPrepare({ dockerOptions })
                        .catch((err) => {
                            expect(err).to.be.instanceOf(Error);
                            expect(err.message).to.eql('dockerOptions.image is a required property');
                        });
                });
            });

            context('when dockerOptions.image is provided', function () {
                it('must run docker', function () {
                    const dockerOptions = {
                        image: 'my-image'
                    };

                    return launcher.onPrepare({ dockerOptions })
                        .then(() => {
                            expect(launcher.docker).to.be.instanceOf(Docker);
                            expect(launcher.docker.image).to.eql('my-image');
                        });
                });
            });

            context('when dockerOptions.args is provided', function () {
                it('must run docker with args', function () {
                    const dockerOptions = {
                        image: 'my-image',
                        args: '-foo'
                    };

                    return launcher.onPrepare({ dockerOptions })
                        .then(() => {
                            expect(launcher.docker.args).to.eql('-foo');
                        });
                });
            });

            context('when dockerOptions.command is provided', function () {
                it('must run docker with command', function () {
                    const dockerOptions = {
                        image: 'my-image',
                        command: '/bin/bash'
                    };

                    return launcher.onPrepare({ dockerOptions })
                        .then(() => {
                            expect(launcher.docker.command).to.eql('/bin/bash');
                        });
                });
            });

            context('when dockerOptions.healthCheck is provided', function () {
                it('must run docker with healthCheck', function () {
                    const dockerOptions = {
                        image: 'my-image',
                        healthCheck: 'http://localhost:8000'
                    };

                    return launcher.onPrepare({ dockerOptions })
                        .then(() => {
                            expect(launcher.docker.healthCheck).to.eql('http://localhost:8000');
                        });
                });
            });

            context('when dockerOptions.options are provided', function () {
                it('must run docker with options', function () {
                    const dockerOptions = {
                        image: 'my-image',
                        options: {
                            e: ['TEST=ME']
                        }
                    };

                    return launcher.onPrepare({ dockerOptions })
                        .then(() => {
                            expect(launcher.docker.options).to.deep.eql({
                                rm: true,
                                e: ['TEST=ME'],
                                cidfile: launcher.docker.cidfile
                            });
                        });
                });
            });
        });

        describe('@dockerLogs', function () {
            beforeEach(function () {
                stub(DockerLauncher.prototype, '_redirectLogStream');
            });

            afterEach(function () {
                DockerLauncher.prototype._redirectLogStream.restore();
            });

            context('when not set', function () {
                it('must not redirect log stream', function () {
                    const config = {
                        dockerOptions: {
                            image: 'my-image'
                        }
                    };

                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(DockerLauncher.prototype._redirectLogStream.called).to.eql(false);
                        });
                });
            });

            context('when set to string', function () {
                it('must redirect log stream', function () {
                    const config = {
                        dockerLogs: './',
                        dockerOptions: {
                            image: 'my-image'
                        }
                    };

                    return launcher.onPrepare(config)
                        .then(() => {
                            launcher.docker.emit('processCreated');
                            expect(DockerLauncher.prototype._redirectLogStream.called).to.eql(true);
                        });
                });
            });
        });

        describe('@onDockerReady', function () {
            context('when onDockerReady is provided', function () {
                const config = {
                    onDockerReady: new spy(),
                    dockerOptions: {
                        image: 'my-image'
                    }
                };

                it('must call onDockerReady', function () {
                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(config.onDockerReady.called).to.eql(true);
                        });
                });
            });
        });

        describe('@coloredLogs', function () {
            context('when set to true', function () {
                const config = {
                    coloredLogs: true,
                    dockerOptions: {
                        image: 'my-image'
                    }
                };

                it('must set docker logger to color-logger', function () {
                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(launcher.docker.logger).to.be.deep.eql(ColorLogger);
                        });
                });
            });

            context('when set to false', function () {
                const config = {
                    coloredLogs: false,
                    dockerOptions: {
                        image: 'my-image'
                    }
                };

                it('must set docker logger to console', function () {
                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(launcher.docker.logger).to.be.eql(console);
                        });
                });
            });
        });

        describe('@debug', function () {
            context('when set to true', function () {
                const config = {
                    debug: true,
                    dockerOptions: {
                        image: 'my-image'
                    }
                };

                it('must set docker debug to true', function () {
                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(launcher.docker.debug).to.eql(true);
                        });
                });
            });

            context('when set to false', function () {
                const config = {
                    debug: false,
                    dockerOptions: {
                        image: 'my-image'
                    }
                };

                it('must set docker debug to false', function () {
                    return launcher.onPrepare(config)
                        .then(() => {
                            expect(launcher.docker.debug).to.eql(false);
                        });
                });
            });
        });
    });

    describe('#onComplete', function () {
        context('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.docker = {
                    stop: new spy()
                };

                launcher.onComplete();
                expect(launcher.docker.stop.called).to.eql(true);
            });
        });
    });
});
