import { expect } from 'chai';
import { sanitizeValue, serializeOption, serializeOptions } from '@root/utils/optionsSerializer.js';

describe('Options Serializer', function() {
    describe('#serializeOption', function() {
        describe('when a single letter option', function() {
            context('and is a boolean', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', true);
                    expect(option).to.eql(['-d']);
                });
            });

            context('and is a string', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', 'boo');
                    expect(option).to.eql(['-d', 'boo']);
                });
            });

            context('and is an array', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', ['foo=bar', 'bar=foo']);
                    expect(option).to.eql(['-d', 'foo=bar', '-d', 'bar=foo']);
                });
            });
        });

        describe('when multiple-letter option', function() {
            context('and is a boolean', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('foo', true);
                    expect(option).to.eql(['--foo']);
                });
            });

            context('and is a string', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('foo', 'boo');
                    expect(option).to.eql(['--foo', 'boo']);
                });
            });

            context('and is an array', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('doo', ['foo=bar', 'bar=foo']);
                    expect(option).to.eql(['--doo', 'foo=bar', '--doo', 'bar=foo']);
                });
            });
        });
    });

    describe('#serializeOptions', function() {
        it('must return an array of serialized options', function() {
            const options = {
                d: true,
                foo: true,
                boo: 'bop',
                e: ['123=345', '678=901']
            };

            expect(serializeOptions(options)).to.deep.equal([
                '-d',
                '--foo',
                '--boo', 'bop',
                '-e', '123=345',
                '-e', '678=901'
            ]);
        });
    });

    describe('#sanitizeValue', function() {
        context('when value is not a string', function() {
            it('must preserve value as is', function() {
                expect(sanitizeValue(true)).to.eql(true);
                expect(sanitizeValue(1)).to.eql(1);
                expect(sanitizeValue([1])).to.eql([1]);
            });
        });

        context('when value is string', function() {
            context('when platform is win32', function() {
                let originalPlatformGetter: PropertyDescriptor;

                beforeEach(function() {
                    originalPlatformGetter = Object.getOwnPropertyDescriptor(process, 'platform') || {};
                    Object.defineProperty(process, 'platform', {
                        value: 'win32'
                    });
                });

                afterEach(function() {
                    Object.defineProperty(process, 'platform', originalPlatformGetter);
                });

                it('must leave string value as is', function() {
                    expect(sanitizeValue('/this is it/')).to.eql('/this is it/');
                });
            });

            context('when platform is NOT win32', function() {
                let originalPlatformGetter: PropertyDescriptor;

                beforeEach(function() {
                    originalPlatformGetter = Object.getOwnPropertyDescriptor(process, 'platform') || {};
                    Object.defineProperty(process, 'platform', {
                        value: 'darwin'
                    });
                });

                afterEach(function() {
                    Object.defineProperty(process, 'platform', originalPlatformGetter);
                });

                it('must escape spaces in value', function() {
                    expect(sanitizeValue('/this is it/')).to.eql('/this\\ is\\ it/');
                });
            });
        });
    });

});
