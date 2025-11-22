import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeValue, serializeOption, serializeOptions } from '@root/utils/optionsSerializer.js';

describe('Options Serializer', function() {
    describe('#serializeOption', function() {
        describe('when a single letter option', function() {
            describe('and is a boolean', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', true);
                    expect(option).toEqual(['-d']);
                });
            });

            describe('and is a string', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', 'boo');
                    expect(option).toEqual(['-d', 'boo']);
                });
            });

            describe('and is an array', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('d', ['foo=bar', 'bar=foo']);
                    expect(option).toEqual(['-d', 'foo=bar', '-d', 'bar=foo']);
                });
            });
        });

        describe('when multiple-letter option', function() {
            describe('and is a boolean', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('foo', true);
                    expect(option).toEqual(['--foo']);
                });
            });

            describe('and is a string', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('foo', 'boo');
                    expect(option).toEqual(['--foo', 'boo']);
                });
            });

            describe('and is an array', function() {
                it('must serialize correctly', function() {
                    const option = serializeOption('doo', ['foo=bar', 'bar=foo']);
                    expect(option).toEqual(['--doo', 'foo=bar', '--doo', 'bar=foo']);
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

            expect(serializeOptions(options)).toEqual([
                '-d',
                '--foo',
                '--boo', 'bop',
                '-e', '123=345',
                '-e', '678=901'
            ]);
        });
    });

    describe('#sanitizeValue', function() {
        describe('when value is not a string', function() {
            it('must preserve value as is', function() {
                expect(sanitizeValue(true)).toEqual(true);
                expect(sanitizeValue(1)).toEqual(1);
                expect(sanitizeValue([1])).toEqual([1]);
            });
        });

        describe('when value is string', function() {
            describe('when platform is win32', function() {
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
                    expect(sanitizeValue('/this is it/')).toEqual('/this is it/');
                });
            });

            describe('when platform is NOT win32', function() {
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
                    expect(sanitizeValue('/this is it/')).toEqual('/this\\ is\\ it/');
                });
            });
        });
    });

});
