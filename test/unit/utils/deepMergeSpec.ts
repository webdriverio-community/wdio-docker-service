import { describe, it, expect } from 'vitest';
import deepMerge from '@root/utils/deepMerge.js';

describe('#deepMerge', function () {
    describe('when a single plain object source is provided', function () {
        const source = {
            foo: 'bar'
        };
        const dest = {
            bar: 'foo'
        };

        it('must merge source with destination', function () {
            expect(deepMerge(dest, source)).toEqual({
                foo: 'bar',
                bar: 'foo'
            });
        });
    });

    describe('when multiple source objects are provided', function () {
        const source1 = {
            foo: 'bar'
        };

        const source2 = {
            foo2: 'bar2'
        };

        const dest = {
            bar: 'foo'
        };

        it('must merge sources with destination', function () {
            expect(deepMerge(dest, source1, source2)).toEqual({
                foo: 'bar',
                foo2: 'bar2',
                bar: 'foo'
            });
        });
    });

    describe('when both source and destination have nested objects', function () {
        const source = {
            foo: {
                child1: 'bar'
            }
        };
        const dest = {
            foo: {
                child2: 'foo'
            }
        };

        it('must merge nested properties of source and destination', function () {
            expect(deepMerge(dest, source)).toEqual({
                foo: {
                    child1: 'bar',
                    child2: 'foo'
                }
            });
        });
    });

    describe('when both source and destination have Array property', function () {
        const source = {
            children: ['foo']
        };
        const dest = {
            children: ['bar']
        };

        it('must merge nested properties of source and destination', function () {
            expect(deepMerge(dest, source)).toEqual({
                children: ['bar', 'foo']
            });
        });
    });

});
